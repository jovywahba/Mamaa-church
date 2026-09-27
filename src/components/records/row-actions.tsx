import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

export function RowActions({ viewHref, editHref, label, children }: { viewHref: string; editHref: string; label: string; children?: React.ReactNode }) {
  const cls = "flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-700";
  return (
    <div className="flex items-center gap-0.5">
      <Link href={viewHref} className={cls} aria-label={`عرض ${label}`} title="عرض">
        <Eye className="size-4" />
      </Link>
      <Link href={editHref} className={cls} aria-label={`تعديل ${label}`} title="تعديل">
        <Pencil className="size-4" />
      </Link>
      {children}
    </div>
  );
}
