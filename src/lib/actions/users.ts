"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, usernameToEmail, USERNAME_PATTERN } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

async function assertAdmin(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_active || user.profile.role !== "admin") return null;
  return user.id;
}

const passwordSchema = z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(72, "كلمة المرور طويلة جداً");

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, "اسم المستخدم يجب أن يكون من 3 إلى 32 حرفاً إنجليزياً أو أرقاماً (مسموح بـ . _ -)"),
  full_name: z.string().trim().min(1, "يرجى إدخال الاسم الكامل").max(100),
  password: passwordSchema,
  role: z.enum(["admin", "staff"]),
});

export async function createAppUser(values: unknown): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "ليس لديك صلاحية لتنفيذ هذا الإجراء" };
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };

  const { username, full_name, password, role } = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name },
    app_metadata: { role },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || error.status === 422) return { ok: false, error: "اسم المستخدم مستخدم من قبل" };
    if (msg.includes("password")) return { ok: false, error: "كلمة المرور ضعيفة، يرجى اختيار كلمة مرور أقوى" };
    return { ok: false, error: "تعذر إنشاء المستخدم" };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "ليس لديك صلاحية لتنفيذ هذا الإجراء" };
  if (!isUuid(userId)) return { ok: false, error: "مستخدم غير موجود" };
  if (userId === adminId && !isActive) return { ok: false, error: "لا يمكنك إيقاف حسابك الحالي" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) return { ok: false, error: "تعذر تحديث حالة المستخدم" };
  // Revoke existing sessions of a deactivated user.
  if (!isActive) await admin.auth.admin.signOut(userId).catch(() => undefined);
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserRole(userId: string, role: "admin" | "staff"): Promise<ActionResult> {
  const adminId = await assertAdmin();
  if (!adminId) return { ok: false, error: "ليس لديك صلاحية لتنفيذ هذا الإجراء" };
  if (!isUuid(userId) || !["admin", "staff"].includes(role)) return { ok: false, error: "بيانات غير صحيحة" };
  if (userId === adminId && role !== "admin") return { ok: false, error: "لا يمكنك إزالة صلاحية المسؤول عن حسابك الحالي" };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: "تعذر تحديث الصلاحية" };
  await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
  revalidatePath("/users");
  return { ok: true };
}

export async function resetUserPassword(userId: string, password: string): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "ليس لديك صلاحية لتنفيذ هذا الإجراء" };
  if (!isUuid(userId)) return { ok: false, error: "مستخدم غير موجود" };
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "كلمة مرور غير صحيحة" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: parsed.data });
  if (error) return { ok: false, error: "تعذر تغيير كلمة المرور" };
  return { ok: true };
}
