type SupabaseLikeError = { code?: string; message?: string; details?: string | null } | null | undefined;

/** Maps Supabase / Postgres errors to friendly Arabic messages. */
export function toArabicError(error: SupabaseLikeError, fallback = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى"): string {
  if (!error) return fallback;
  const message = error.message ?? "";

  if (message.includes("ASSISTANCE_TYPE_REQUIRED")) return "يرجى اختيار نوع مساعدة واحد على الأقل";
  if (message.includes("DONATION_CATEGORY_REQUIRED")) return "يرجى اختيار جهة واحدة على الأقل للمساعدة";
  if (message.includes("NOT_FOUND") || error.code === "PGRST116") return "السجل غير موجود أو تم حذفه";
  if (message.includes("NOT_AUTHORIZED") || error.code === "42501") return "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  if (error.code === "23514") return "بعض البيانات المدخلة غير صحيحة، يرجى مراجعتها";
  if (error.code === "23505") return "هذه البيانات مسجلة من قبل";
  if (error.code === "23503") return "لا يمكن تنفيذ العملية لارتباط البيانات بسجلات أخرى";
  if (error.code === "22P02") return "صيغة البيانات غير صحيحة";
  if (error.code === "PGRST202" || error.code === "PGRST205" || error.code === "42P01" || error.code === "42883") {
    return "قاعدة البيانات غير مهيأة بعد. يرجى تشغيل ملف supabase/schema.sql";
  }
  if (message.toLowerCase().includes("fetch failed") || message.toLowerCase().includes("network")) {
    return "تعذر الاتصال بقاعدة البيانات، تحقق من اتصال الإنترنت";
  }
  if (message.toLowerCase().includes("jwt")) return "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى";
  return fallback;
}
