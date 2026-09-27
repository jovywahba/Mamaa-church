import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authEmailDomain } from "@/lib/env";
import type { Profile } from "@/lib/types";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase Auth needs an email; users only ever see/type their username. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${authEmailDomain}`;
}

export type CurrentUser = { id: string; profile: Profile | null };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  return { id: data.user.id, profile: profile ?? null };
});

/** Use in every protected page/layout. Redirects to login when needed. */
export async function requireUser(): Promise<CurrentUser & { profile: Profile }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile || !user.profile.is_active) redirect("/auth/signout?reason=inactive");
  return user as CurrentUser & { profile: Profile };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.profile.role !== "admin") redirect("/");
  return user;
}
