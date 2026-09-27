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
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-4 py-3 text-start text-xs font-bold whitespace-nowrap text-slate-500", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} onClick={(e) => onRowClick(e, row)} className="cursor-pointer transition-colors hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-slate-700", c.className)}>
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
          <li key={rowKey(row)} onClick={(e) => onRowClick(e, row)} className="cursor-pointer p-4 active:bg-slate-50">
            {mobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
