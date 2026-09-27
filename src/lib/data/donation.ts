import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";
import type { DonationCase, DonationListRow, LookupOption } from "@/lib/types";

export type DonationFilters = {
  q?: string;
  category_ids?: string[];
  referred_by?: string;
  date_from?: string;
  date_to?: string;
  father_name?: string;
  mother_name?: string;
  phone?: string;
};

export async function listDonationCases(filters: DonationFilters, page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_donation_cases", {
    p_filters: filters,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as DonationListRow[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

const DETAIL_SELECT = `
  id, father_name, father_age, father_birth_year, father_job,
  mother_name, mother_age, mother_birth_year, mother_job,
  father_phone, mother_phone, notes, referred_by, other_category, additional_notes,
  created_at, updated_at,
  children:donation_children(id, name, age, birth_year, job, sort_order),
  case_categories:donation_case_categories(category:donation_categories(id, code, name_ar, sort_order, is_other)),
  creator:profiles!donation_cases_created_by_fkey(full_name, username),
  updater:profiles!donation_cases_updated_by_fkey(full_name, username)
`;

type RawDonationCase = Omit<DonationCase, "categories"> & {
  case_categories: { category: LookupOption | null }[];
};

export async function getDonationCase(id: string): Promise<DonationCase | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("donation_cases")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle<RawDonationCase>();
  if (error) throw error;
  if (!data) return null;

  const { case_categories, ...rest } = data;
  return {
    ...rest,
    children: [...rest.children].sort((a, b) => a.sort_order - b.sort_order),
    categories: case_categories
      .map((cc) => cc.category)
      .filter((c): c is LookupOption => Boolean(c))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}
