"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

/** Accessible modal confirmation built on the native <dialog> element. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  loading,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      dir="rtl"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[1px]"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={
              tone === "danger"
                ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                : "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"
            }
          >
            <AlertTriangle className="size-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <div className="text-sm leading-relaxed text-slate-600">{description}</div>}
          </div>
        </div>
      </div>
      <div className="flex flex-row-reverse gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </dialog>
  );
}
