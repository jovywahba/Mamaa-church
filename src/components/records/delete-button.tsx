"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ActionResult } from "@/lib/types";

type DeleteButtonProps = {
  recordLabel: string;
  action: () => Promise<ActionResult>;
  redirectTo?: string;
  variant?: "icon" | "button";
};

export function DeleteButton({ recordLabel, action, redirectTo, variant = "button" }: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("تم حذف السجل بنجاح");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label={`حذف ${recordLabel}`}
          title="حذف"
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)} className="border-red-200 text-red-600 hover:bg-red-50">
          <Trash2 className="size-4" aria-hidden />
          حذف
        </Button>
      )}
      <ConfirmDialog
        open={open}
        title="تأكيد الحذف"
        description={
          <>
            هل أنت متأكد من حذف <strong className="text-slate-900">{recordLabel}</strong>؟ سيتم حذف جميع البيانات المرتبطة
            بها (الأولاد وأرقام التواصل وأنواع المساعدة) نهائياً ولا يمكن التراجع عن هذا الإجراء.
          </>
        }
        confirmLabel="نعم، احذف"
        loading={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
