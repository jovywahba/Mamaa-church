"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_PATTERN, usernameToEmail, USERNAME_PATTERN } from "@/lib/auth";

export type LoginState = { error?: string; username?: string };

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "يرجى إدخال اسم المستخدم"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  // Only allow same-site relative paths to avoid open redirects.
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) return next;
  return "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next") ?? undefined,
  });
  const username = String(formData.get("username") ?? "");

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, username };
  }
  // Accept either a plain username (mapped to the internal email) or a full email address.
  const identifier = parsed.data.username;
  const isEmail = EMAIL_PATTERN.test(identifier);
  if (!isEmail && !USERNAME_PATTERN.test(identifier)) {
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة", username };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: isEmail ? identifier : usernameToEmail(identifier),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("fetch") || msg.includes("network")) {
      return { error: "تعذر الاتصال بالخادم، تحقق من اتصال الإنترنت", username };
    }
    if (error?.status === 429) {
      return { error: "محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى", username };
    }
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة", username };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "هذا الحساب غير مفعل. يرجى التواصل مع مسؤول النظام", username };
  }

  redirect(safeNext(parsed.data.next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
