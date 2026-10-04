-- =====================================================================
-- Migration 2026-10-04 — donation date and donation type
-- ---------------------------------------------------------------------
-- Adds to التبرعات إلى من يديك أعطيناك:
--   * donation_date   (تاريخ التبرع)
--   * donation types  (نوع التبرع — one or more, lookup + junction table)
--   * cash_amount     (المبلغ, EGP — required when the type «نقدي» is chosen)
--   * other_donation_type (details for «تبرعات أخرى»)
--
-- Safe to run on the existing database: additive only, idempotent.
-- supabase/schema.sql already contains these changes for fresh installs.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- Lookup: donation types
-- ---------------------------------------------------------------------
create table if not exists public.donation_types (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_ar     text not null unique,
  sort_order  integer not null default 0,
  is_cash     boolean not null default false,
  is_other    boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.donation_types (code, name_ar, sort_order, is_cash, is_other) values
  ('cash',                 'نقدي',                       1,  true,  false),
  ('furniture_appliances', 'موبيليا أو أجهزة كهربائية',  2,  false, false),
  ('school_supplies',      'ملخصات أو أدوات مدرسية',     3,  false, false),
  ('clothes',              'ملابس أو شوزات أو شنط',      4,  false, false),
  ('kitchen',              'أدوات مطبخ',                 5,  false, false),
  ('carpets',              'سجاد أو كليم',               6,  false, false),
  ('furnishings',          'مفروشات',                    7,  false, false),
  ('mattresses',           'مراتب',                      8,  false, false),
  ('windows_doors',        'شبابيك أو أبواب',            9,  false, false),
  ('other',                'تبرعات أخرى',                99, false, true)
on conflict (code) do update
  set name_ar = excluded.name_ar, sort_order = excluded.sort_order,
      is_cash = excluded.is_cash, is_other = excluded.is_other;

-- ---------------------------------------------------------------------
-- Columns + junction table
-- ---------------------------------------------------------------------
alter table public.donation_cases
  add column if not exists donation_date       date,
  add column if not exists cash_amount         numeric(12, 2),
  add column if not exists other_donation_type text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'donation_cases_cash_amount_check') then
    alter table public.donation_cases add constraint donation_cases_cash_amount_check check (cash_amount >= 0);
  end if;
end;
$$;

create table if not exists public.donation_case_types (
  case_id     uuid not null references public.donation_cases (id) on delete cascade,
  type_id     uuid not null references public.donation_types (id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (case_id, type_id)
);

create index if not exists donation_case_types_type_idx      on public.donation_case_types (type_id);
create index if not exists donation_cases_donation_date_idx  on public.donation_cases (donation_date desc);

-- ---------------------------------------------------------------------
-- Search text also covers donation types
-- ---------------------------------------------------------------------
create or replace function public.donation_case_search_text(c public.donation_cases)
returns text
language sql
stable
set search_path = ''
as $$
  select public.normalize_ar(concat_ws(' ',
    c.father_name, c.father_job, c.mother_name, c.mother_job,
    c.father_phone, c.mother_phone, c.notes, c.referred_by,
    c.other_category, c.additional_notes, c.other_donation_type,
    (select string_agg(concat_ws(' ', ch.name, ch.job), ' ')
       from public.donation_children ch where ch.case_id = c.id),
    (select string_agg(cat.name_ar, ' ')
       from public.donation_case_categories cc
       join public.donation_categories cat on cat.id = cc.category_id
      where cc.case_id = c.id),
    (select string_agg(dt.name_ar, ' ')
       from public.donation_case_types dct
       join public.donation_types dt on dt.id = dct.type_id
      where dct.case_id = c.id)
  ));
$$;

-- ---------------------------------------------------------------------
-- save_donation_case: now also saves date, types, cash amount
-- ---------------------------------------------------------------------
create or replace function public.save_donation_case(p_data jsonb, p_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_category_ids uuid[];
  v_type_ids uuid[];
  v_has_cash boolean;
  v_cash numeric := nullif(p_data ->> 'cash_amount', '')::numeric;
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

  select coalesce(array_agg(distinct x::uuid), '{}')
    into v_type_ids
    from jsonb_array_elements_text(coalesce(p_data -> 'donation_type_ids', '[]'::jsonb)) as x;

  if cardinality(v_type_ids) = 0 then
    raise exception 'DONATION_TYPE_REQUIRED' using errcode = 'P0001';
  end if;

  select exists (select 1 from public.donation_types where id = any (v_type_ids) and is_cash) into v_has_cash;
  if v_has_cash and v_cash is null then
    raise exception 'CASH_AMOUNT_REQUIRED' using errcode = 'P0001';
  end if;
  if not v_has_cash then
    v_cash := null;  -- an amount only makes sense for cash donations
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
    delete from public.donation_case_types where case_id = v_id;
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

  insert into public.donation_case_types (case_id, type_id)
  select v_id, unnest(v_type_ids);

  update public.donation_cases set
    father_name         = nullif(btrim(p_data ->> 'father_name'), ''),
    father_age          = nullif(p_data ->> 'father_age', '')::smallint,
    father_birth_year   = nullif(p_data ->> 'father_birth_year', '')::smallint,
    father_job          = nullif(btrim(p_data ->> 'father_job'), ''),
    mother_name         = nullif(btrim(p_data ->> 'mother_name'), ''),
    mother_age          = nullif(p_data ->> 'mother_age', '')::smallint,
    mother_birth_year   = nullif(p_data ->> 'mother_birth_year', '')::smallint,
    mother_job          = nullif(btrim(p_data ->> 'mother_job'), ''),
    father_phone        = nullif(public.normalize_phone(p_data ->> 'father_phone'), ''),
    mother_phone        = nullif(public.normalize_phone(p_data ->> 'mother_phone'), ''),
    notes               = nullif(btrim(p_data ->> 'notes'), ''),
    referred_by         = nullif(btrim(p_data ->> 'referred_by'), ''),
    other_category      = nullif(btrim(p_data ->> 'other_category'), ''),
    additional_notes    = nullif(btrim(p_data ->> 'additional_notes'), ''),
    donation_date       = nullif(p_data ->> 'donation_date', '')::date,
    cash_amount         = v_cash,
    other_donation_type = nullif(btrim(p_data ->> 'other_donation_type'), '')
  where id = v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- list_donation_cases: returns date / types / amount, new filters
--   donation_type_ids[], donation_from, donation_to (YYYY-MM-DD)
-- (return type changed → drop first)
-- ---------------------------------------------------------------------
drop function if exists public.list_donation_cases(jsonb, integer, integer);

create function public.list_donation_cases(
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
  donation_date date,
  donation_type_names text[],
  cash_amount numeric,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_patterns    text[] := public.search_patterns(p_filters ->> 'q');
  v_cat_ids     uuid[];
  v_type_ids    uuid[];
  v_date_from   date := nullif(p_filters ->> 'date_from', '')::date;
  v_date_to     date := nullif(p_filters ->> 'date_to', '')::date;
  v_don_from    date := nullif(p_filters ->> 'donation_from', '')::date;
  v_don_to      date := nullif(p_filters ->> 'donation_to', '')::date;
  v_father      text := nullif(btrim(public.normalize_ar(p_filters ->> 'father_name')), '');
  v_mother      text := nullif(btrim(public.normalize_ar(p_filters ->> 'mother_name')), '');
  v_referred    text := nullif(btrim(public.normalize_ar(p_filters ->> 'referred_by')), '');
  v_phone       text := nullif(regexp_replace(public.normalize_ar(p_filters ->> 'phone'), '[^0-9]', '', 'g'), '');
begin
  if jsonb_typeof(p_filters -> 'category_ids') = 'array' and jsonb_array_length(p_filters -> 'category_ids') > 0 then
    select array_agg(x::uuid) into v_cat_ids from jsonb_array_elements_text(p_filters -> 'category_ids') x;
  end if;
  if jsonb_typeof(p_filters -> 'donation_type_ids') = 'array' and jsonb_array_length(p_filters -> 'donation_type_ids') > 0 then
    select array_agg(x::uuid) into v_type_ids from jsonb_array_elements_text(p_filters -> 'donation_type_ids') x;
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
    c.donation_date,
    coalesce((select array_agg(dt.name_ar order by dt.sort_order)
                from public.donation_case_types dct
                join public.donation_types dt on dt.id = dct.type_id
               where dct.case_id = c.id), '{}'),
    c.cash_amount,
    c.created_at,
    count(*) over ()
  from public.donation_cases c
  where (v_patterns is null or (c.search_text like v_patterns[1] and c.search_text like all (v_patterns)))
    and (v_cat_ids is null or exists (
          select 1 from public.donation_case_categories cc
           where cc.case_id = c.id and cc.category_id = any (v_cat_ids)))
    and (v_type_ids is null or exists (
          select 1 from public.donation_case_types dct
           where dct.case_id = c.id and dct.type_id = any (v_type_ids)))
    and (v_date_from is null or (c.created_at at time zone 'Africa/Cairo')::date >= v_date_from)
    and (v_date_to   is null or (c.created_at at time zone 'Africa/Cairo')::date <= v_date_to)
    and (v_don_from  is null or c.donation_date >= v_don_from)
    and (v_don_to    is null or c.donation_date <= v_don_to)
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

-- ---------------------------------------------------------------------
-- Row Level Security & privileges for the new tables / functions
-- ---------------------------------------------------------------------
alter table public.donation_types      enable row level security;
alter table public.donation_case_types enable row level security;

drop policy if exists "donation_types_select" on public.donation_types;
create policy "donation_types_select" on public.donation_types
  for select to authenticated using ((select public.is_active_user()));

drop policy if exists donation_case_types_select on public.donation_case_types;
drop policy if exists donation_case_types_insert on public.donation_case_types;
drop policy if exists donation_case_types_update on public.donation_case_types;
drop policy if exists donation_case_types_delete on public.donation_case_types;
create policy donation_case_types_select on public.donation_case_types
  for select to authenticated using ((select public.is_active_user()));
create policy donation_case_types_insert on public.donation_case_types
  for insert to authenticated with check ((select public.is_active_user()));
create policy donation_case_types_update on public.donation_case_types
  for update to authenticated using ((select public.is_active_user())) with check ((select public.is_active_user()));
create policy donation_case_types_delete on public.donation_case_types
  for delete to authenticated using ((select public.is_active_user()));

revoke all on public.donation_types, public.donation_case_types from anon;
grant select on public.donation_types to authenticated;
grant select, insert, update, delete on public.donation_case_types to authenticated;

revoke execute on function public.list_donation_cases(jsonb, integer, integer) from public, anon;
grant  execute on function public.list_donation_cases(jsonb, integer, integer) to authenticated;
revoke execute on function public.save_donation_case(jsonb, uuid) from public, anon;
grant  execute on function public.save_donation_case(jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
