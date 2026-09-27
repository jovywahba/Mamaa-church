"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <h2 className="text-lg font-bold text-slate-900">حدث خطأ أثناء تحميل الصفحة</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        تعذر جلب البيانات من قاعدة البيانات. تحقق من اتصال الإنترنت، وإذا استمرت المشكلة تأكد من تهيئة قاعدة البيانات
        (ملف supabase/schema.sql).
      </p>
      <Button onClick={reset} variant="outline" className="mt-6">
        <RotateCcw className="size-4" aria-hidden />
        إعادة المحاولة
      </Button>
    </div>
  );
}
