"use client";

import { deleteFamilyCase } from "@/lib/actions/family";
import { familyTitle, formatDate } from "@/lib/format";
import type { FamilyListRow } from "@/lib/types";
import { BadgeList } from "@/components/ui/badge";
import { PhoneNumber } from "@/components/ui/phone";
import { DataTable, type Column } from "./data-table";
import { DeleteButton } from "./delete-button";
import { RowActions } from "./row-actions";

const dash = <span className="text-slate-400">—</span>;

function Actions({ row }: { row: FamilyListRow }) {
  const label = familyTitle(row.father_name, row.mother_name);
  return (
    <RowActions viewHref={`/families/${row.id}`} editHref={`/families/${row.id}/edit`} label={label}>
      <DeleteButton variant="icon" recordLabel={label} action={() => deleteFamilyCase(row.id)} />
    </RowActions>
  );
}

const columns: Column<FamilyListRow>[] = [
  { key: "father", header: "اسم الأب", cell: (r) => <span className="font-semibold text-slate-900">{r.father_name || dash}</span> },
  { key: "mother", header: "اسم الأم", cell: (r) => r.mother_name || dash },
  { key: "children", header: "عدد الأولاد", className: "text-center", cell: (r) => <span className="tabular-nums">{r.children_count}</span> },
  {
    key: "phone",
    header: "رقم الهاتف",
    cell: (r) =>
      r.phones.length ? (
        <div className="flex flex-col whitespace-nowrap">
          <PhoneNumber value={r.phones[0]} />
          {r.phones.length > 1 && <span className="text-xs text-slate-400">+{r.phones.length - 1} أرقام أخرى</span>}
        </div>
      ) : (
        dash
      ),
  },
  { key: "address", header: "العنوان", className: "max-w-56", cell: (r) => (r.address ? <span className="line-clamp-2">{r.address}</span> : dash) },
  { key: "types", header: "نوع المساعدة", className: "max-w-64", cell: (r) => <BadgeList items={r.type_names} /> },
  { key: "created", header: "تاريخ الإضافة", className: "whitespace-nowrap", cell: (r) => formatDate(r.created_at) },
  { key: "actions", header: "إجراءات", className: "w-28", cell: (r) => <Actions row={r} /> },
];

export function FamilyTable({ rows }: { rows: FamilyListRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      rowHref={(r) => `/families/${r.id}`}
      mobileCard={(r) => (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{r.father_name || r.mother_name}</p>
              {r.father_name && r.mother_name && <p className="text-sm text-slate-500">الأم: {r.mother_name}</p>}
            </div>
            <Actions row={r} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{r.children_count} أولاد</span>
            {r.phones[0] && <PhoneNumber value={r.phones[0]} withIcon />}
            <span>{formatDate(r.created_at)}</span>
          </div>
          {r.address && <p className="line-clamp-1 text-xs text-slate-500">{r.address}</p>}
          <BadgeList items={r.type_names} max={3} />
        </div>
      )}
    />
  );
}
