"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";

/** Shared submit flow: call the server action, toast, then go to the record. */
export function useSaveHandler(detailBase: string) {
  const router = useRouter();
  const [saving, startTransition] = useTransition();

  function save(run: () => Promise<ActionResult<{ id: string }>>) {
    startTransition(async () => {
      try {
        const result = await run();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("تم حفظ البيانات بنجاح");
        router.push(`${detailBase}/${result.data.id}`);
        router.refresh();
      } catch {
        toast.error("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");
      }
    });
  }

  return { saving, save };
}

export function onInvalidToast() {
  toast.error("يرجى مراجعة الحقول المطلوبة");
  // Scroll the first invalid field into view.
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el && "focus" in el) el.focus({ preventScroll: true });
  });
}
