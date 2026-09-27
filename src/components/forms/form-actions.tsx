"use client";

import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormActions({ submitting, cancelHref }: { submitting: boolean; cancelHref: string }) {
  const router = useRouter();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
      <Button variant="outline" onClick={() => router.push(cancelHref)} disabled={submitting}>
        <X className="size-4" aria-hidden />
        إلغاء
      </Button>
      <Button type="submit" loading={submitting} className="min-w-28">
        {!submitting && <Save className="size-4" aria-hidden />}
        {submitting ? "جاري الحفظ..." : "حفظ"}
      </Button>
    </div>
  );
}
