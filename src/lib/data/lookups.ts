import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DonationTypeOption, LookupOption } from "@/lib/types";

const COLUMNS = "id, code, name_ar, sort_order, is_other";

export const getFamilyAssistanceTypes = cache(async (): Promise<LookupOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_assistance_types")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const getDonationCategories = cache(async (): Promise<LookupOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("donation_categories")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const getDonationTypes = cache(async (): Promise<DonationTypeOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("donation_types")
    .select(`${COLUMNS}, is_cash`)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});
