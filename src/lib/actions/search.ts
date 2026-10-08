"use server";

import { getCurrentUser } from "@/lib/auth";
import { globalSearch, parseSearchKind } from "@/lib/data/search";
import type { SearchResult } from "@/lib/types";

/** Live suggestions for the search box in the top bar (one section at a time). */
export async function quickSearch(query: string, kind: SearchResult["kind"]): Promise<SearchResult[]> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_active) return [];
  if (typeof query !== "string" || query.trim().length < 2) return [];
  try {
    return (await globalSearch(query.slice(0, 100), parseSearchKind(kind), 8)).slice(0, 8);
  } catch {
    return [];
  }
}
