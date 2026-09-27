"use client";

import { deleteDonationCase } from "@/lib/actions/donation";
import { familyTitle, formatDate } from "@/lib/format";
import type { DonationListRow } from "@/lib/types";
import { BadgeList } from "@/components/ui/badge";
import { PhoneNumber } from "@/components/ui/phone";
import { DataTable, type Column } from "./data-table";
import { DeleteButton } from "./delete-button";
import { RowActions } from "./row-actions";

const dash = <span className="text-slate-400">—</span>;

function Phones({ row }: { row: DonationListRow }) {
  if (!row.father_phone && !row.mother_phone) return dash;
  return (
    <div className="flex flex-col gap-0.5 text-xs whitespace-nowrap">
      {row.father_phone && (
        <span>
          <span className="text-slate-400">الأب: </span>
          <PhoneNumber value={row.father_phone} />
        </span>
      )}
      {row.mother_phone && (
        <span>
          <span className="text-slate-400">الأم: </span>
          <PhoneNumber value={row.mother_phone} />
        </span>
      )}
    </div>
  );
}

function Actions({ row }: { row: DonationListRow }) {
  const label = familyTitle(row.father_name, row.mother_name);
  return (
    <RowActions viewHref={`/donations/${row.id}`} editHref={`/donations/${row.id}/edit`} label={label}>
      <DeleteButton variant="icon" recordLabel={label} action={() => deleteDonationCase(row.id)} />
    </RowActions>
  );
}

const columns: Column<DonationListRow>[] = [
  { key: "father", header: "اسم الأب", cell: (r) => <span className="font-semibold text-slate-900">{r.father_name || dash}</span> },
  { key: "mother", header: "اسم الأم", cell: (r) => r.mother_name || dash },
  { key: "phones", header: "أرقام الهاتف", cell: (r) => <Phones row={r} /> },
  { key: "referred", header: "الحالة من طرف", cell: (r) => r.referred_by || dash },
  { key: "categories", header: "المساعدة موجهة إلى", className: "max-w-64", cell: (r) => <BadgeList items={r.category_names} tone="green" /> },
  { key: "created", header: "تاريخ الإضافة", className: "whitespace-nowrap", cell: (r) => formatDate(r.created_at) },
  { key: "actions", header: "إجراءات", className: "w-28", cell: (r) => <Actions row={r} /> },
];

export function DonationTable({ rows }: { rows: DonationListRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      rowHref={(r) => `/donations/${r.id}`}
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
            {r.referred_by && <span>من طرف: {r.referred_by}</span>}
            {(r.father_phone || r.mother_phone) && <PhoneNumber value={(r.father_phone || r.mother_phone)!} withIcon />}
            <span>{formatDate(r.created_at)}</span>
          </div>
          <BadgeList items={r.category_names} max={3} tone="green" />
        </div>
      )}
    />
  );
}
