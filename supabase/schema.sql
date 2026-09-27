-- =====================================================================
-- Mama Church — Supabase schema
-- ---------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and run it.
-- It is idempotent: running it again will not duplicate data.
--
-- Contents:
--   1. Extensions & helpers (Arabic text normalisation)
--   2. profiles (application users, linked to auth.users)
--   3. Lookup tables (assistance types / donation categories) + seed
--   4. خدمات من يديك أعطيناك إلى الأسر  (family_assistance_*, incl. service
--      date, expenses and import provenance — see supabase/migrations/)
--   5. التبرعات إلى من يديك أعطيناك      (donation_*)
--   6. Triggers (updated_at, audit columns, search text)
--   7. RPC functions (save / list / global search)
--   8. Row Level Security policies & grants
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. Extensions & helpers
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

-- Normalise Arabic text for search:
--  * remove diacritics (tashkeel) and tatweel
--  * unify alef forms, taa marbuta, alef maqsura, hamza carriers
--  * convert Arabic-Indic / Persian digits to Latin digits
--  * lower-case Latin letters
create or replace function public.normalize_ar(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    translate(
      regexp_replace(coalesce(input, ''), '[ً-ْٰـ]', '', 'g'),
      'أإآٱىةؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      'اااايهوي01234567890123456789'
    )
  );
$$;

-- Keep only digits (and a leading +) from a phone number.
create or replace function public.normalize_phone(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(public.normalize_ar(input), '[^0-9+]', '', 'g');
$$;

-- Generic updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. profiles — one row per application user (auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (length(username) between 2 and 64),
  full_name   text not null default '',
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically whenever an auth user is created.
-- username / full_name come from user metadata; role from app metadata
-- (app metadata cannot be changed by the user themselves).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'staff' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that existed before this script ran.
insert into public.profiles (id, username, full_name, role)
select
  u.id,
  lower(coalesce(nullif(u.raw_user_meta_data ->> 'username', ''), split_part(u.email, '@', 1))),
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  case when u.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'staff' end
from auth.users u
on conflict (id) do nothing;

-- Is the current request made by an active application user?
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Lookup tables
-- ---------------------------------------------------------------------
create table if not exists public.family_assistance_types (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_ar     text not null unique,
  sort_order  integer not null default 0,
  is_other    boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.family_assistance_types (code, name_ar, sort_order, is_other) values
  ('pope_kyrillos_boys_home', 'دار أولاد البابا كيرلس', 1, false),
  ('house_finishing',         'تشطيب بيوت', 2, false),
  ('financial_aid',           'مساعدات مادية', 3, false),
  ('medical',                 'علاج أو عمليات جراحية', 4, false),
  ('debt_payment',            'تسديد ديون', 5, false),
  ('education',               'دفع مصاريف مدارس أو كليات وشراء كتب وملخصات', 6, false),
  ('projects',                'فتح مشاريع', 7, false),
  ('food',                    'أكل', 8, false),
  ('clothes',                 'ملابس وشوزات وشنط', 9, false),
  ('furniture',               'موبيليا', 10, false),
  ('appliances',              'أجهزة كهربائية', 11, false),
  ('other',                   'أخرى', 99, true)
on conflict (code) do update
  set name_ar = excluded.name_ar, sort_order = excluded.sort_order, is_other = excluded.is_other;

create table if not exists public.donation_categories (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_ar     text not null unique,
  sort_order  integer not null default 0,
  is_other    boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.donation_categories (code, name_ar, sort_order, is_other) values
  ('pope_kyrillos_boys_home', 'دار البابا كيرلس للأولاد', 1, false),
  ('medical',                 'للمرضى والعمليات الجراحية والعلاج', 2, false),
  ('living_expenses',         'لمصاريف المعيشة', 3, false),
  ('churches',                'للكنائس', 4, false),
  ('education',               'لمصاريف المدارس والكليات', 5, false),
  ('debt_payment',            'لتسديد ديون', 6, false),
  ('projects',                'لفتح مشاريع', 7, false),
  ('special_circumstances',   'لظروف خاصة', 8, false),
  ('other',                   'أخرى', 99, true)
on conflict (code) do update
  set name_ar = excluded.name_ar, sort_order = excluded.sort_order, is_other = excluded.is_other;

-- ---------------------------------------------------------------------
-- 4. خدمات من يديك أعطيناك إلى الأسر
-- ---------------------------------------------------------------------
create table if not exists public.family_assistance_cases (
  id                uuid primary key default gen_random_uuid(),
  father_name       text,
  father_age        smallint check (father_age between 0 and 130),
  father_job        text,
  mother_name       text,
  mother_age        smallint check (mother_age between 0 and 130),
  mother_job        text,
  address           text,
  notes             text,
  other_assistance  text,
  search_text       text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  constraint family_cases_parent_name_required
    check (coalesce(btrim(father_name), '') <> '' or coalesce(btrim(mother_name), '') <> '')
);

create table if not exists public.family_assistance_children (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.family_assistance_cases (id) on delete cascade,
  name             text not null check (btrim(name) <> ''),
  age              smallint check (age between 0 and 80),
  education_stage  text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.family_assistance_phones (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.family_assistance_cases (id) on delete cascade,
  phone       text not null check (phone ~ '^\+?[0-9]{6,15}$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.family_assistance_case_types (
  case_id     uuid not null references public.family_assistance_cases (id) on delete cascade,
  type_id     uuid not null references public.family_assistance_types (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (case_id, type_id)
);

create index if not exists family_cases_created_at_idx   on public.family_assistance_cases (created_at desc);
create index if not exists family_cases_search_trgm_idx  on public.family_assistance_cases using gin (search_text gin_trgm_ops);
create index if not exists family_cases_father_trgm_idx  on public.family_assistance_cases using gin (father_name gin_trgm_ops);
create index if not exists family_cases_mother_trgm_idx  on public.family_assistance_cases using gin (mother_name gin_trgm_ops);
create index if not exists family_cases_address_trgm_idx on public.family_assistance_cases using gin (address gin_trgm_ops);
create index if not exists family_cases_created_by_idx   on public.family_assistance_cases (created_by);
create index if not exists family_cases_updated_by_idx   on public.family_assistance_cases (updated_by);
create index if not exists family_children_case_idx      on public.family_assistance_children (case_id, sort_order);
create index if not exists family_children_stage_idx     on public.family_assistance_children (education_stage);
create index if not exists family_phones_case_idx        on public.family_assistance_phones (case_id, sort_order);
create index if not exists family_phones_phone_idx       on public.family_assistance_phones (phone);
create index if not exists family_case_types_type_idx    on public.family_assistance_case_types (type_id);

-- ---------------------------------------------------------------------
-- Service history columns (added 2026-09; ALTERs keep existing installs in sync)
-- ---------------------------------------------------------------------
alter table public.family_assistance_cases
  add column if not exists father_birth_year   smallint,
  add column if not exists mother_birth_year   smallint,
  add column if not exists service_date        date,
  add column if not exists expense_amount      numeric(12, 2),
  add column if not exists source_service_type text,
  add column if not exists source_recorded_at  timestamptz,
  add column if not exists import_key          text;

alter table public.family_assistance_children
  add column if not exists birth_year smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'family_cases_father_birth_year_check') then
    alter table public.family_assistance_cases add constraint family_cases_father_birth_year_check
      check (father_birth_year between 1900 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_cases_mother_birth_year_check') then
    alter table public.family_assistance_cases add constraint family_cases_mother_birth_year_check
      check (mother_birth_year between 1900 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_cases_father_age_or_year') then
    alter table public.family_assistance_cases add constraint family_cases_father_age_or_year
      check (father_age is null or father_birth_year is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_cases_mother_age_or_year') then
    alter table public.family_assistance_cases add constraint family_cases_mother_age_or_year
      check (mother_age is null or mother_birth_year is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_cases_expense_check') then
    alter table public.family_assistance_cases add constraint family_cases_expense_check
      check (expense_amount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_children_birth_year_check') then
    alter table public.family_assistance_children add constraint family_children_birth_year_check
      check (birth_year between 1900 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_children_age_or_year') then
    alter table public.family_assistance_children add constraint family_children_age_or_year
      check (age is null or birth_year is null);
  end if;
end;
$$;

create unique index if not exists family_cases_import_key_uidx
  on public.family_assistance_cases (import_key) where import_key is not null;
create index if not exists family_cases_service_date_idx on public.family_assistance_cases (service_date desc);
create index if not exists family_cases_expense_idx      on public.family_assistance_cases (expense_amount);

-- ---------------------------------------------------------------------
-- 5. التبرعات إلى من يديك أعطيناك
-- ---------------------------------------------------------------------
create table if not exists public.donation_cases (
  id                 uuid primary key default gen_random_uuid(),
  father_name        text,
  father_age         smallint check (father_age between 0 and 130),
  father_birth_year  smallint check (father_birth_year between 1900 and 2100),
  father_job         text,
  mother_name        text,
  mother_age         smallint check (mother_age between 0 and 130),
  mother_birth_year  smallint check (mother_birth_year between 1900 and 2100),
  mother_job         text,
  father_phone       text check (father_phone ~ '^\+?[0-9]{6,15}$'),
  mother_phone       text check (mother_phone ~ '^\+?[0-9]{6,15}$'),
  notes              text,
  referred_by        text,   -- الحالة من طرف
  other_category     text,   -- أخرى
  additional_notes   text,   -- ملاحظات إضافية
  search_text        text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  constraint donation_cases_parent_name_required
    check (coalesce(btrim(father_name), '') <> '' or coalesce(btrim(mother_name), '') <> ''),
  constraint donation_cases_father_age_or_year check (father_age is null or father_birth_year is null),
  constraint donation_cases_mother_age_or_year check (mother_age is null or mother_birth_year is null)
);

create table if not exists public.donation_children (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.donation_cases (id) on delete cascade,
  name        text not null check (btrim(name) <> ''),
  age         smallint check (age between 0 and 130),
  birth_year  smallint check (birth_year between 1900 and 2100),
  job         text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint donation_children_age_or_year check (age is null or birth_year is null)
);

create table if not exists public.donation_case_categories (
  case_id      uuid not null references public.donation_cases (id) on delete cascade,
  category_id  uuid not null references public.donation_categories (id) on delete restrict,
  created_at   timestamptz not null default now(),
  primary key (case_id, category_id)
);

create index if not exists donation_cases_created_at_idx   on public.donation_cases (created_at desc);
create index if not exists donation_cases_search_trgm_idx  on public.donation_cases using gin (search_text gin_trgm_ops);
create index if not exists donation_cases_father_trgm_idx  on public.donation_cases using gin (father_name gin_trgm_ops);
create index if not exists donation_cases_mother_trgm_idx  on public.donation_cases using gin (mother_name gin_trgm_ops);
create index if not exists donation_cases_referred_trgm_idx on public.donation_cases using gin (referred_by gin_trgm_ops);
create index if not exists donation_cases_father_phone_idx on public.donation_cases (father_phone);
create index if not exists donation_cases_mother_phone_idx on public.donation_cases (mother_phone);
create index if not exists donation_cases_created_by_idx   on public.donation_cases (created_by);
create index if not exists donation_cases_updated_by_idx   on public.donation_cases (updated_by);
create index if not exists donation_children_case_idx      on public.donation_children (case_id, sort_order);
create index if not exists donation_case_categories_cat_idx on public.donation_case_categories (category_id);

-- ---------------------------------------------------------------------
-- 6. Triggers: audit columns + denormalised search text
-- ---------------------------------------------------------------------

-- Audit columns: created_by / updated_by always come from the JWT, never
-- from the client payload; created_* can never be changed afterwards.
create or replace function public.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.updated_by := new.created_by;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce((select auth.uid()), new.updated_by);
  end if;
  return new;
end;
$$;

create or replace function public.family_case_search_text(c public.family_assistance_cases)
returns text
language sql
stable
set search_path = ''
as $$
  select public.normalize_ar(concat_ws(' ',
    c.father_name, c.father_job, c.mother_name, c.mother_job,
    c.address, c.notes, c.other_assistance, c.source_service_type,
    (select string_agg(concat_ws(' ', ch.name, ch.education_stage), ' ')
       from public.family_assistance_children ch where ch.case_id = c.id),
    (select string_agg(ph.phone, ' ')
       from public.family_assistance_phones ph where ph.case_id = c.id),
    (select string_agg(t.name_ar, ' ')
       from public.family_assistance_case_types ct
       join public.family_assistance_types t on t.id = ct.type_id
      where ct.case_id = c.id)
  ));
$$;

create or replace function public.donation_case_search_text(c public.donation_cases)
returns text
language sql
stable
set search_path = ''
as $$
  select public.normalize_ar(concat_ws(' ',
    c.father_name, c.father_job, c.mother_name, c.mother_job,
    c.father_phone, c.mother_phone, c.notes, c.referred_by,
    c.other_category, c.additional_notes,
    (select string_agg(concat_ws(' ', ch.name, ch.job), ' ')
       from public.donation_children ch where ch.case_id = c.id),
    (select string_agg(cat.name_ar, ' ')
       from public.donation_case_categories cc
       join public.donation_categories cat on cat.id = cc.category_id
      where cc.case_id = c.id)
  ));
$$;

create or replace function public.family_case_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := public.family_case_search_text(new);
  return new;
end;
$$;

create or replace function public.donation_case_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := public.donation_case_search_text(new);
  return new;
end;
$$;

drop trigger if exists family_cases_audit on public.family_assistance_cases;
create trigger family_cases_audit
  before insert or update on public.family_assistance_cases
  for each row execute function public.set_audit_columns();

-- Runs after the audit trigger (triggers fire in name order: "audit" < "search").
drop trigger if exists family_cases_search on public.family_assistance_cases;
create trigger family_cases_search
  before insert or update on public.family_assistance_cases
  for each row execute function public.family_case_before_write();

drop trigger if exists donation_cases_audit on public.donation_cases;
create trigger donation_cases_audit
  before insert or update on public.donation_cases
  for each row execute function public.set_audit_columns();

drop trigger if exists donation_cases_search on public.donation_cases;
create trigger donation_cases_search
  before insert or update on public.donation_cases
  for each row execute function public.donation_case_before_write();

-- ---------------------------------------------------------------------
-- 7. RPC functions (SECURITY INVOKER → RLS still applies)
-- ---------------------------------------------------------------------

-- Split a search query into normalised LIKE patterns ('%word%').
-- Phone-like queries (digits, spaces, dashes, +) collapse into one number.
create or replace function public.search_patterns(p_query text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  with q as (select btrim(public.normalize_ar(p_query)) as v)
  select case
    when q.v = '' then null
    when q.v ~ '^[0-9+\s\-()]+$' then
      array['%' || regexp_replace(q.v, '[^0-9]', '', 'g') || '%']
    else (
      select array_agg('%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%')
      from regexp_split_to_table(q.v, '\s+') as w
      where w <> ''
    )
  end
  from q;
$$;

-- Create (p_id null) or update a family assistance case with its children,
-- phones and assistance types in a single transaction.
create or replace function public.save_family_case(p_data jsonb, p_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_type_ids uuid[];
begin
  if not public.is_active_user() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct x::uuid), '{}')
    into v_type_ids
    from jsonb_array_elements_text(coalesce(p_data -> 'type_ids', '[]'::jsonb)) as x;

  if cardinality(v_type_ids) = 0 then
    raise exception 'ASSISTANCE_TYPE_REQUIRED' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.family_assistance_cases (father_name, mother_name)
    values (nullif(btrim(p_data ->> 'father_name'), ''), nullif(btrim(p_data ->> 'mother_name'), ''))
    returning id into v_id;
  else
    select id into v_id from public.family_assistance_cases where id = p_id for update;
    if v_id is null then
      raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
    delete from public.family_assistance_children where case_id = v_id;
    delete from public.family_assistance_phones where case_id = v_id;
    delete from public.family_assistance_case_types where case_id = v_id;
  end if;

  insert into public.family_assistance_children (case_id, name, age, birth_year, education_stage, sort_order)
  select v_id,
         btrim(c ->> 'name'),
         nullif(c ->> 'age', '')::smallint,
         nullif(c ->> 'birth_year', '')::smallint,
         nullif(btrim(c ->> 'education_stage'), ''),
         ord::integer
    from jsonb_array_elements(coalesce(p_data -> 'children', '[]'::jsonb)) with ordinality as t(c, ord)
   where coalesce(btrim(c ->> 'name'), '') <> '';

  insert into public.family_assistance_phones (case_id, phone, sort_order)
  select v_id, public.normalize_phone(p), ord::integer
    from jsonb_array_elements_text(coalesce(p_data -> 'phones', '[]'::jsonb)) with ordinality as t(p, ord)
   where public.normalize_phone(p) <> '';

  insert into public.family_assistance_case_types (case_id, type_id)
  select v_id, unnest(v_type_ids);

  update public.family_assistance_cases set
    father_name       = nullif(btrim(p_data ->> 'father_name'), ''),
    father_age        = nullif(p_data ->> 'father_age', '')::smallint,
    father_birth_year = nullif(p_data ->> 'father_birth_year', '')::smallint,
    father_job        = nullif(btrim(p_data ->> 'father_job'), ''),
    mother_name       = nullif(btrim(p_data ->> 'mother_name'), ''),
    mother_age        = nullif(p_data ->> 'mother_age', '')::smallint,
    mother_birth_year = nullif(p_data ->> 'mother_birth_year', '')::smallint,
    mother_job        = nullif(btrim(p_data ->> 'mother_job'), ''),
    address           = nullif(btrim(p_data ->> 'address'), ''),
    notes             = nullif(btrim(p_data ->> 'notes'), ''),
    other_assistance  = nullif(btrim(p_data ->> 'other_assistance'), ''),
    service_date      = nullif(p_data ->> 'service_date', '')::date,
    expense_amount    = nullif(p_data ->> 'expense_amount', '')::numeric
  where id = v_id;

  return v_id;
end;
$$;

create or replace function public.save_donation_case(p_data jsonb, p_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_category_ids uuid[];
begin
  if not public.is_active_user() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct x::uuid), '{}')
    into v_category_ids
    from jsonb_array_elements_text(coalesce(p_data -> 'category_ids', '[]'::jsonb)) as x;

  if cardinality(v_category_ids) = 0 then
    raise exception 'DONATION_CATEGORY_REQUIRED' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.donation_cases (father_name, mother_name)
    values (nullif(btrim(p_data ->> 'father_name'), ''), nullif(btrim(p_data ->> 'mother_name'), ''))
    returning id into v_id;
  else
    select id into v_id from public.donation_cases where id = p_id for update;
    if v_id is null then
      raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
    delete from public.donation_children where case_id = v_id;
    delete from public.donation_case_categories where case_id = v_id;
  end if;

  insert into public.donation_children (case_id, name, age, birth_year, job, sort_order)
  select v_id,
         btrim(c ->> 'name'),
         nullif(c ->> 'age', '')::smallint,
         nullif(c ->> 'birth_year', '')::smallint,
         nullif(btrim(c ->> 'job'), ''),
         ord::integer
    from jsonb_array_elements(coalesce(p_data -> 'children', '[]'::jsonb)) with ordinality as t(c, ord)
   where coalesce(btrim(c ->> 'name'), '') <> '';

  insert into public.donation_case_categories (case_id, category_id)
  select v_id, unnest(v_category_ids);

  update public.donation_cases set
    father_name       = nullif(btrim(p_data ->> 'father_name'), ''),
    father_age        = nullif(p_data ->> 'father_age', '')::smallint,
    father_birth_year = nullif(p_data ->> 'father_birth_year', '')::smallint,
    father_job        = nullif(btrim(p_data ->> 'father_job'), ''),
    mother_name       = nullif(btrim(p_data ->> 'mother_name'), ''),
    mother_age        = nullif(p_data ->> 'mother_age', '')::smallint,
    mother_birth_year = nullif(p_data ->> 'mother_birth_year', '')::smallint,
    mother_job        = nullif(btrim(p_data ->> 'mother_job'), ''),
    father_phone      = nullif(public.normalize_phone(p_data ->> 'father_phone'), ''),
    mother_phone      = nullif(public.normalize_phone(p_data ->> 'mother_phone'), ''),
    notes             = nullif(btrim(p_data ->> 'notes'), ''),
    referred_by       = nullif(btrim(p_data ->> 'referred_by'), ''),
    other_category    = nullif(btrim(p_data ->> 'other_category'), ''),
    additional_notes  = nullif(btrim(p_data ->> 'additional_notes'), '')
  where id = v_id;

  return v_id;
end;
$$;

-- Paginated + filtered list of family assistance cases.
-- p_filters keys (all optional):
--   q, type_ids[], date_from, date_to (YYYY-MM-DD, Cairo time),
--   father_name, mother_name, address,
--   parent_age_min, parent_age_max, child_age_min, child_age_max, education_stage,
--   service_from, service_to (تاريخ الخدمة), expense_min, expense_max (المصاريف)
drop function if exists public.list_family_cases(jsonb, integer, integer);

create function public.list_family_cases(
  p_filters jsonb default '{}'::jsonb,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  father_name text,
  mother_name text,
  address text,
  children_count integer,
  phones text[],
  type_names text[],
  service_date date,
  expense_amount numeric,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_patterns     text[] := public.search_patterns(p_filters ->> 'q');
  v_type_ids     uuid[];
  v_date_from    date := nullif(p_filters ->> 'date_from', '')::date;
  v_date_to      date := nullif(p_filters ->> 'date_to', '')::date;
  v_service_from date := nullif(p_filters ->> 'service_from', '')::date;
  v_service_to   date := nullif(p_filters ->> 'service_to', '')::date;
  v_exp_min      numeric := nullif(p_filters ->> 'expense_min', '')::numeric;
  v_exp_max      numeric := nullif(p_filters ->> 'expense_max', '')::numeric;
  v_father       text := nullif(btrim(public.normalize_ar(p_filters ->> 'father_name')), '');
  v_mother       text := nullif(btrim(public.normalize_ar(p_filters ->> 'mother_name')), '');
  v_address      text := nullif(btrim(public.normalize_ar(p_filters ->> 'address')), '');
  v_pmin         int  := nullif(p_filters ->> 'parent_age_min', '')::int;
  v_pmax         int  := nullif(p_filters ->> 'parent_age_max', '')::int;
  v_cmin         int  := nullif(p_filters ->> 'child_age_min', '')::int;
  v_cmax         int  := nullif(p_filters ->> 'child_age_max', '')::int;
  v_stage        text := nullif(btrim(p_filters ->> 'education_stage'), '');
  v_year         int  := extract(year from (now() at time zone 'Africa/Cairo'))::int;
begin
  if jsonb_typeof(p_filters -> 'type_ids') = 'array' and jsonb_array_length(p_filters -> 'type_ids') > 0 then
    select array_agg(x::uuid) into v_type_ids from jsonb_array_elements_text(p_filters -> 'type_ids') x;
  end if;

  return query
  select
    c.id,
    c.father_name,
    c.mother_name,
    c.address,
    (select count(*)::int from public.family_assistance_children ch where ch.case_id = c.id),
    coalesce((select array_agg(ph.phone order by ph.sort_order)
                from public.family_assistance_phones ph where ph.case_id = c.id), '{}'),
    coalesce((select array_agg(t.name_ar order by t.sort_order)
                from public.family_assistance_case_types ct
                join public.family_assistance_types t on t.id = ct.type_id
               where ct.case_id = c.id), '{}'),
    c.service_date,
    c.expense_amount,
    c.created_at,
    count(*) over ()
  from public.family_assistance_cases c
  where (v_patterns is null or (c.search_text like v_patterns[1] and c.search_text like all (v_patterns)))
    and (v_type_ids is null or exists (
          select 1 from public.family_assistance_case_types ct
           where ct.case_id = c.id and ct.type_id = any (v_type_ids)))
    and (v_date_from is null or (c.created_at at time zone 'Africa/Cairo')::date >= v_date_from)
    and (v_date_to   is null or (c.created_at at time zone 'Africa/Cairo')::date <= v_date_to)
    and (v_service_from is null or c.service_date >= v_service_from)
    and (v_service_to   is null or c.service_date <= v_service_to)
    and (v_exp_min is null or c.expense_amount >= v_exp_min)
    and (v_exp_max is null or c.expense_amount <= v_exp_max)
    and (v_father  is null or public.normalize_ar(c.father_name) like '%' || v_father || '%')
    and (v_mother  is null or public.normalize_ar(c.mother_name) like '%' || v_mother || '%')
    and (v_address is null or public.normalize_ar(c.address) like '%' || v_address || '%')
    -- parent age: use the stored age, or derive it from the birth year
    and ((v_pmin is null and v_pmax is null)
         or coalesce(c.father_age, v_year - c.father_birth_year) between coalesce(v_pmin, 0) and coalesce(v_pmax, 200)
         or coalesce(c.mother_age, v_year - c.mother_birth_year) between coalesce(v_pmin, 0) and coalesce(v_pmax, 200))
    and ((v_cmin is null and v_cmax is null and v_stage is null) or exists (
          select 1 from public.family_assistance_children ch
           where ch.case_id = c.id
             and (v_stage is null or ch.education_stage = v_stage)
             and ((v_cmin is null and v_cmax is null)
                  or coalesce(ch.age, v_year - ch.birth_year) between coalesce(v_cmin, 0) and coalesce(v_cmax, 200))))
  order by c.created_at desc, c.id
  limit greatest(least(coalesce(p_limit, 20), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------
-- import_family_case: one-time historical import (service role only).
-- Idempotent: a record whose import_key already exists is skipped.
-- p_data uses the save_family_case payload plus:
--   import_key, source_service_type, source_recorded_at
-- Returns 'inserted' or 'skipped'.
-- ---------------------------------------------------------------------
create or replace function public.import_family_case(p_data jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_key text := nullif(btrim(p_data ->> 'import_key'), '');
begin
  if v_key is null then
    raise exception 'IMPORT_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  -- serialise concurrent runs on the same key
  perform pg_advisory_xact_lock(hashtext(v_key));
  if exists (select 1 from public.family_assistance_cases where import_key = v_key) then
    return 'skipped';
  end if;

  insert into public.family_assistance_cases (father_name, mother_name, import_key)
  values (nullif(btrim(p_data ->> 'father_name'), ''), nullif(btrim(p_data ->> 'mother_name'), ''), v_key)
  returning id into v_id;

  insert into public.family_assistance_children (case_id, name, age, birth_year, education_stage, sort_order)
  select v_id,
         btrim(c ->> 'name'),
         nullif(c ->> 'age', '')::smallint,
         nullif(c ->> 'birth_year', '')::smallint,
         nullif(btrim(c ->> 'education_stage'), ''),
         ord::integer
    from jsonb_array_elements(coalesce(p_data -> 'children', '[]'::jsonb)) with ordinality as t(c, ord)
   where coalesce(btrim(c ->> 'name'), '') <> '';

  insert into public.family_assistance_phones (case_id, phone, sort_order)
  select v_id, public.normalize_phone(p), ord::integer
    from jsonb_array_elements_text(coalesce(p_data -> 'phones', '[]'::jsonb)) with ordinality as t(p, ord)
   where public.normalize_phone(p) <> '';

  insert into public.family_assistance_case_types (case_id, type_id)
  select v_id, t.id
    from public.family_assistance_types t
   where t.code in (select jsonb_array_elements_text(coalesce(p_data -> 'type_codes', '[]'::jsonb)));

  if not exists (select 1 from public.family_assistance_case_types where case_id = v_id) then
    raise exception 'ASSISTANCE_TYPE_REQUIRED' using errcode = 'P0001';
  end if;

  update public.family_assistance_cases set
    father_age          = nullif(p_data ->> 'father_age', '')::smallint,
    father_birth_year   = nullif(p_data ->> 'father_birth_year', '')::smallint,
    father_job          = nullif(btrim(p_data ->> 'father_job'), ''),
    mother_age          = nullif(p_data ->> 'mother_age', '')::smallint,
    mother_birth_year   = nullif(p_data ->> 'mother_birth_year', '')::smallint,
    mother_job          = nullif(btrim(p_data ->> 'mother_job'), ''),
    address             = nullif(btrim(p_data ->> 'address'), ''),
    notes               = nullif(btrim(p_data ->> 'notes'), ''),
    other_assistance    = nullif(btrim(p_data ->> 'other_assistance'), ''),
    service_date        = nullif(p_data ->> 'service_date', '')::date,
    expense_amount      = nullif(p_data ->> 'expense_amount', '')::numeric,
    source_service_type = nullif(btrim(p_data ->> 'source_service_type'), ''),
    source_recorded_at  = nullif(p_data ->> 'source_recorded_at', '')::timestamptz
  where id = v_id;

  return 'inserted';
end;
$$;

-- Paginated + filtered list of donation cases.
-- p_filters keys (all optional):
--   q, category_ids[], referred_by, date_from, date_to, father_name, mother_name, phone
create or replace function public.list_donation_cases(
  p_filters jsonb default '{}'::jsonb,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  father_name text,
  mother_name text,
  father_phone text,
  mother_phone text,
  referred_by text,
  children_count integer,
  category_names text[],
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_patterns   text[] := public.search_patterns(p_filters ->> 'q');
  v_cat_ids    uuid[];
  v_date_from  date := nullif(p_filters ->> 'date_from', '')::date;
  v_date_to    date := nullif(p_filters ->> 'date_to', '')::date;
  v_father     text := nullif(btrim(public.normalize_ar(p_filters ->> 'father_name')), '');
  v_mother     text := nullif(btrim(public.normalize_ar(p_filters ->> 'mother_name')), '');
  v_referred   text := nullif(btrim(public.normalize_ar(p_filters ->> 'referred_by')), '');
  v_phone      text := nullif(regexp_replace(public.normalize_ar(p_filters ->> 'phone'), '[^0-9]', '', 'g'), '');
begin
  if jsonb_typeof(p_filters -> 'category_ids') = 'array' and jsonb_array_length(p_filters -> 'category_ids') > 0 then
    select array_agg(x::uuid) into v_cat_ids from jsonb_array_elements_text(p_filters -> 'category_ids') x;
  end if;

  return query
  select
    c.id,
    c.father_name,
    c.mother_name,
    c.father_phone,
    c.mother_phone,
    c.referred_by,
    (select count(*)::int from public.donation_children ch where ch.case_id = c.id),
    coalesce((select array_agg(cat.name_ar order by cat.sort_order)
                from public.donation_case_categories cc
                join public.donation_categories cat on cat.id = cc.category_id
               where cc.case_id = c.id), '{}'),
    c.created_at,
    count(*) over ()
  from public.donation_cases c
  where (v_patterns is null or (c.search_text like v_patterns[1] and c.search_text like all (v_patterns)))
    and (v_cat_ids is null or exists (
          select 1 from public.donation_case_categories cc
           where cc.case_id = c.id and cc.category_id = any (v_cat_ids)))
    and (v_date_from is null or (c.created_at at time zone 'Africa/Cairo')::date >= v_date_from)
    and (v_date_to   is null or (c.created_at at time zone 'Africa/Cairo')::date <= v_date_to)
    and (v_father   is null or public.normalize_ar(c.father_name) like '%' || v_father || '%')
    and (v_mother   is null or public.normalize_ar(c.mother_name) like '%' || v_mother || '%')
    and (v_referred is null or public.normalize_ar(c.referred_by) like '%' || v_referred || '%')
    and (v_phone    is null or c.father_phone like '%' || v_phone || '%'
                            or c.mother_phone like '%' || v_phone || '%')
  order by c.created_at desc, c.id
  limit greatest(least(coalesce(p_limit, 20), 200), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Global search across both sections.
create or replace function public.global_search(p_query text, p_limit integer default 30)
returns table (
  kind text,           -- 'family' | 'donation'
  id uuid,
  father_name text,
  mother_name text,
  details text,
  created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_patterns text[] := public.search_patterns(p_query);
  v_limit int := greatest(least(coalesce(p_limit, 30), 100), 1);
begin
  if v_patterns is null then
    return;
  end if;

  return query
  (
    select 'family'::text, c.id, c.father_name, c.mother_name,
           concat_ws(' • ',
             c.address,
             (select string_agg(ph.phone, ' / ' order by ph.sort_order)
                from public.family_assistance_phones ph where ph.case_id = c.id)),
           c.created_at
      from public.family_assistance_cases c
     where c.search_text like v_patterns[1] and c.search_text like all (v_patterns)
     order by c.created_at desc
     limit v_limit
  )
  union all
  (
    select 'donation'::text, c.id, c.father_name, c.mother_name,
           concat_ws(' • ',
             case when c.referred_by is not null then 'من طرف: ' || c.referred_by end,
             nullif(concat_ws(' / ', c.father_phone, c.mother_phone), '')),
           c.created_at
      from public.donation_cases c
     where c.search_text like v_patterns[1] and c.search_text like all (v_patterns)
     order by c.created_at desc
     limit v_limit
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Row Level Security & grants
-- ---------------------------------------------------------------------
-- Model: this is an internal system. Every *active* application user
-- (row in profiles with is_active = true) can read and manage all case
-- records. Anonymous users can access nothing. Users, roles and lookup
-- tables can only be changed server-side (service role / SQL editor).

alter table public.profiles                     enable row level security;
alter table public.family_assistance_types      enable row level security;
alter table public.donation_categories          enable row level security;
alter table public.family_assistance_cases      enable row level security;
alter table public.family_assistance_children   enable row level security;
alter table public.family_assistance_phones     enable row level security;
alter table public.family_assistance_case_types enable row level security;
alter table public.donation_cases               enable row level security;
alter table public.donation_children            enable row level security;
alter table public.donation_case_categories     enable row level security;

-- profiles: active users can see names of colleagues (for "added by").
drop policy if exists "profiles_select_active_users" on public.profiles;
create policy "profiles_select_active_users" on public.profiles
  for select to authenticated
  using ((select public.is_active_user()) or id = (select auth.uid()));

-- lookup tables: read-only for active users.
drop policy if exists "family_types_select" on public.family_assistance_types;
create policy "family_types_select" on public.family_assistance_types
  for select to authenticated using ((select public.is_active_user()));

drop policy if exists "donation_categories_select" on public.donation_categories;
create policy "donation_categories_select" on public.donation_categories
  for select to authenticated using ((select public.is_active_user()));

-- case tables: full CRUD for active users.
do $$
declare
  t text;
begin
  foreach t in array array[
    'family_assistance_cases', 'family_assistance_children',
    'family_assistance_phones', 'family_assistance_case_types',
    'donation_cases', 'donation_children', 'donation_case_categories'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_active_user()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_active_user()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_active_user())) with check ((select public.is_active_user()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_active_user()))', t || '_delete', t);
  end loop;
end;
$$;

-- Table privileges (defence in depth on top of RLS): nothing for anon.
revoke all on public.profiles, public.family_assistance_types, public.donation_categories,
  public.family_assistance_cases, public.family_assistance_children,
  public.family_assistance_phones, public.family_assistance_case_types,
  public.donation_cases, public.donation_children, public.donation_case_categories
  from anon;

grant select on public.profiles, public.family_assistance_types, public.donation_categories to authenticated;
grant select, insert, update, delete on
  public.family_assistance_cases, public.family_assistance_children,
  public.family_assistance_phones, public.family_assistance_case_types,
  public.donation_cases, public.donation_children, public.donation_case_categories
  to authenticated;

-- Function privileges: only signed-in users may call the RPCs.
revoke execute on function
  public.is_active_user(),
  public.save_family_case(jsonb, uuid),
  public.save_donation_case(jsonb, uuid),
  public.list_family_cases(jsonb, integer, integer),
  public.list_donation_cases(jsonb, integer, integer),
  public.global_search(text, integer),
  public.handle_new_user()
  from public, anon;

grant execute on function
  public.is_active_user(),
  public.save_family_case(jsonb, uuid),
  public.save_donation_case(jsonb, uuid),
  public.list_family_cases(jsonb, integer, integer),
  public.list_donation_cases(jsonb, integer, integer),
  public.global_search(text, integer)
  to authenticated;

-- The import RPC bypasses RLS (security definer) → service role only.
revoke execute on function public.import_family_case(jsonb) from public, anon, authenticated;
grant  execute on function public.import_family_case(jsonb) to service_role;

-- Make PostgREST pick up the new schema immediately.
notify pgrst, 'reload schema';
