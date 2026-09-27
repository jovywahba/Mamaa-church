"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { isUuid } from "@/lib/utils";
import { donationFormSchema, donationFormToPayload } from "@/lib/validation/donation";
import type { ActionResult } from "@/lib/types";

export async function saveDonationCase(id: string | null, values: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_active) return { ok: false, error: "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى" };
  if (id !== null && !isUuid(id)) return { ok: false, error: "السجل غير موجود" };

  const parsed = donationFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "يرجى مراجعة البيانات المدخلة" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_donation_case", {
    p_data: donationFormToPayload(parsed.data),
    p_id: id,
  });
  if (error) return { ok: false, error: toArabicError(error, "تعذر حفظ البيانات، يرجى المحاولة مرة أخرى") };

  revalidatePath("/donations");
  revalidatePath("/");
  return { ok: true, data: { id: data as string } };
}

export async function deleteDonationCase(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_active) return { ok: false, error: "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى" };
  if (!isUuid(id)) return { ok: false, error: "السجل غير موجود" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("donation_cases").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: toArabicError(error, "تعذر حذف السجل") };
  if (!data?.length) return { ok: false, error: "السجل غير موجود أو تم حذفه" };

  revalidatePath("/donations");
  revalidatePath("/");
  return { ok: true };
}
