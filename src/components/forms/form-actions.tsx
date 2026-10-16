"use client";

import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormActions({ submitting, cancelHref }: { submitting: boolean; cancelHref: string }) {
  const router = useRouter();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgb(15_23_42/0.12)] backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
      <p className="hidden text-xs text-slate-500 sm:block">
        الحقول المميزة بـ <span className="font-bold text-red-500">*</span> مطلوبة
      </p>
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <Button variant="outline" onClick={() => router.push(cancelHref)} disabled={submitting} className="flex-1 sm:flex-none">
          <X className="size-4" aria-hidden />
          إلغاء
        </Button>
        <Button type="submit" loading={submitting} className="min-w-28 flex-1 sm:flex-none">
          {!submitting && <Save className="size-4" aria-hidden />}
          {submitting ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </div>
  );
}
