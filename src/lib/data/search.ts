import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SearchResult } from "@/lib/types";

export type SearchKind = SearchResult["kind"];

export function parseSearchKind(value: unknown): SearchKind {
  return value === "donation" ? "donation" : "family";
}

/**
 * Search one section only — خدمات الأسر and التبرعات are searched separately.
 * (`global_search` returns up to `limit` rows per section; we keep the requested one.)
 */
export async function globalSearch(query: string, kind: SearchKind, limit = 30): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("global_search", { p_query: q, p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as SearchResult[])
    .filter((r) => r.kind === kind)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
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
