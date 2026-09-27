"use server";

import { getCurrentUser } from "@/lib/auth";
import { globalSearch } from "@/lib/data/search";
import type { SearchResult } from "@/lib/types";

/** Live suggestions for the global search box in the top bar. */
export async function quickSearch(query: string): Promise<SearchResult[]> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_active) return [];
  if (typeof query !== "string" || query.trim().length < 2) return [];
  try {
    return (await globalSearch(query.slice(0, 100), 6)).slice(0, 8);
  } catch {
    return [];
  }
}
