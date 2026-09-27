import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SearchResult } from "@/lib/types";

export async function globalSearch(query: string, limit = 30): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("global_search", { p_query: q, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as SearchResult[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getDashboardCounts() {
  const supabase = await createClient();
  const [families, donations] = await Promise.all([
    supabase.from("family_assistance_cases").select("id", { count: "exact", head: true }),
    supabase.from("donation_cases").select("id", { count: "exact", head: true }),
  ]);
  return {
    families: families.error ? null : (families.count ?? 0),
    donations: donations.error ? null : (donations.count ?? 0),
  };
}
