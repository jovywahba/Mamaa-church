-- =====================================================================
-- Migration 2026-10-08 — servant / donor of a family service
-- ---------------------------------------------------------------------
-- Adds «الخادم / المتبرع» (servant_name) to خدمات من يديك أعطيناك إلى الأسر:
-- the person who carried out or funded the service. Searching or
-- filtering by that name lists all of that person's services, and the
-- list RPC now also returns the total expenses of the filtered records.
--
-- Safe to run on the existing database: additive only, idempotent.
-- supabase/schema.sql already contains these changes for fresh installs.
-- =====================================================================

set search_path = public, extensions;

alter table public.family_assistance_cases
  add column if not exists servant_name text;

create index if not exists family_cases_servant_trgm_idx
  on public.family_assistance_cases using gin (servant_name gin_trgm_ops);

-- Search text also covers the servant / donor name
create or replace function public.family_case_search_text(c public.family_assistance_cases)
returns text
language sql
stable
set search_path = ''
as $$
  select public.normalize_ar(concat_ws(' ',
    c.father_name, c.father_job, c.mother_name, c.mother_job,
    c.address, c.notes, c.other_assistance, c.source_service_type, c.servant_name,
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

-- save_family_case: also saves servant_name (whitespace collapsed)
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
    expense_amount    = nullif(p_data ->> 'expense_amount', '')::numeric,
    servant_name      = nullif(regexp_replace(btrim(p_data ->> 'servant_name'), '\s+', ' ', 'g'), '')
  where id = v_id;

  return v_id;
end;
$$;

-- list_family_cases: returns servant_name and the filtered total expenses,
-- new filter servant_name (return type changed → drop first)
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
  servant_name text,
  service_date date,
  expense_amount numeric,
  created_at timestamptz,
  total_count bigint,
  total_expense numeric
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
  v_servant      text := nullif(btrim(public.normalize_ar(p_filters ->> 'servant_name')), '');
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
    c.servant_name,
    c.service_date,
    c.expense_amount,
    c.created_at,
    count(*) over (),
    sum(c.expense_amount) over ()
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
    and (v_servant is null or public.normalize_ar(c.servant_name) like '%' || v_servant || '%')
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

revoke execute on function public.list_family_cases(jsonb, integer, integer) from public, anon;
grant  execute on function public.list_family_cases(jsonb, integer, integer) to authenticated;
revoke execute on function public.save_family_case(jsonb, uuid) from public, anon;
grant  execute on function public.save_family_case(jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
