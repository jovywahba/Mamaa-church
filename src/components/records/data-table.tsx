"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref: (row: T) => string;
  /** Card layout for small screens. */
  mobileCard: (row: T) => React.ReactNode;
};

/** Clickable records table on desktop, stacked cards on mobile. */
export function DataTable<T>({ rows, columns, rowKey, rowHref, mobileCard }: DataTableProps<T>) {
  const router = useRouter();

  const onRowClick = (e: React.MouseEvent, row: T) => {
    // Let links / buttons inside the row handle their own clicks.
    if ((e.target as HTMLElement).closest("a,button,[role=dialog],dialog")) return;
    router.push(rowHref(row));
  };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn("px-4 py-3 text-start text-xs font-bold tracking-wide whitespace-nowrap text-slate-600", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={(e) => onRowClick(e, row)}
                className="group cursor-pointer transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-primary-50/50"
              >
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3.5 align-middle leading-6 text-slate-700",
                      // Accent on the leading (right, in RTL) edge of the hovered row.
                      i === 0 && "shadow-[inset_-3px_0_0_transparent] transition-shadow group-hover:shadow-[inset_-3px_0_0_var(--color-primary-500)]",
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            onClick={(e) => onRowClick(e, row)}
            className="cursor-pointer px-4 py-4 transition-colors hover:bg-slate-50 active:bg-primary-50/60"
          >
            {mobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
