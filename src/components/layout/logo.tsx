import Link from "next/link";
import { Church } from "lucide-react";

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-700 text-white shadow-sm">
        <Church className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold text-slate-900">Mama Church</span>
          <span className="block text-xs text-slate-500">من يديك أعطيناك</span>
        </span>
      )}
    </Link>
  );
}
