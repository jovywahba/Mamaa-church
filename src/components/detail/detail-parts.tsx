import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { AuditPerson } from "@/lib/types";
import { SectionCard } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

export function InfoItem({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const empty = children === null || children === undefined || children === "" || children === "—";
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={cn("text-sm leading-relaxed break-words", empty ? "text-slate-400" : "font-medium text-slate-900")}>
        {empty ? "—" : children}
      </dd>
    </div>
  );
}

export function InfoGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </dl>
  );
}

export function MultilineText({ value }: { value: string | null }) {
  if (!value) return <p className="text-sm text-slate-400">لا توجد</p>;
  return <p className="text-sm leading-7 whitespace-pre-line text-slate-800">{value}</p>;
}

function personLabel(p: AuditPerson) {
  if (!p) return "—";
  return p.full_name ? `${p.full_name} (${p.username})` : p.username;
}

export function SystemInfo({
  id,
  createdAt,
  updatedAt,
  creator,
  updater,
  importedFrom,
}: {
  id: string;
  createdAt: string;
  updatedAt: string;
  creator: AuditPerson;
  updater: AuditPerson;
  /** Provenance line for records imported from historical files. */
  importedFrom?: string;
}) {
  return (
    <SectionCard title="معلومات النظام" icon={<Settings2 />}>
      <InfoGrid cols={2}>
        <InfoItem label="تاريخ إضافة الحالة">{formatDateTime(createdAt)}</InfoItem>
        <InfoItem label="آخر تعديل">{formatDateTime(updatedAt)}</InfoItem>
        <InfoItem label="أضيفت بواسطة">{creator ? personLabel(creator) : importedFrom ? "استيراد تلقائي" : "—"}</InfoItem>
        <InfoItem label="آخر تعديل بواسطة">{personLabel(updater)}</InfoItem>
        {importedFrom && (
          <InfoItem label="مصدر السجل" className="sm:col-span-2">
            {importedFrom}
          </InfoItem>
        )}
        <InfoItem label="رقم السجل" className="sm:col-span-2">
          <bdi dir="ltr" className="font-mono text-xs text-slate-600 select-all">
            {id}
          </bdi>
        </InfoItem>
      </InfoGrid>
    </SectionCard>
  );
}
