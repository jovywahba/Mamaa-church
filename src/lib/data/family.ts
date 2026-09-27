import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import type { FamilyCase, FamilyListRow, LookupOption } from "@/lib/types";

export type FamilyFilters = {
  q?: string;
  type_ids?: string[];
  date_from?: string;
  date_to?: string;
  father_name?: string;
  mother_name?: string;
  address?: string;
  parent_age_min?: string;
  parent_age_max?: string;
  child_age_min?: string;
  child_age_max?: string;
  education_stage?: string;
  service_from?: string;
  service_to?: string;
  expense_min?: string;
  expense_max?: string;
};

export async function listFamilyCases(filters: FamilyFilters, page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_family_cases", {
    p_filters: filters,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const rows = ((data ?? []) as FamilyListRow[]).map((r) => ({
    ...r,
    expense_amount: r.expense_amount === null ? null : Number(r.expense_amount),
  }));
  return { rows, total: rows[0]?.total_count ?? 0 };
}

const DETAIL_SELECT = `
  id, father_name, father_age, father_birth_year, father_job,
  mother_name, mother_age, mother_birth_year, mother_job,
  address, notes, other_assistance, service_date, expense_amount,
  source_service_type, source_recorded_at, created_at, updated_at,
  children:family_assistance_children(id, name, age, birth_year, education_stage, sort_order),
  phones:family_assistance_phones(id, phone, sort_order),
  case_types:family_assistance_case_types(type:family_assistance_types(id, code, name_ar, sort_order, is_other)),
  creator:profiles!family_assistance_cases_created_by_fkey(full_name, username),
  updater:profiles!family_assistance_cases_updated_by_fkey(full_name, username)
`;

type RawFamilyCase = Omit<FamilyCase, "types"> & { case_types: { type: LookupOption | null }[] };

export async function getFamilyCase(id: string): Promise<FamilyCase | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_assistance_cases")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle<RawFamilyCase>();
  if (error) throw error;
  if (!data) return null;

  const { case_types, ...rest } = data;
  return {
    ...rest,
    expense_amount: rest.expense_amount === null ? null : Number(rest.expense_amount),
    children: [...rest.children].sort((a, b) => a.sort_order - b.sort_order),
    phones: [...rest.phones].sort((a, b) => a.sort_order - b.sort_order),
    types: case_types
      .map((ct) => ct.type)
      .filter((t): t is LookupOption => Boolean(t))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}
