import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
};

function hrefFor(basePath: string, searchParams: PaginationProps["searchParams"], page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;
    (Array.isArray(value) ? value : [value]).forEach((v) => params.append(key, v));
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pagination({ page, pageSize, total, basePath, searchParams }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const itemClass = "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        عرض <span className="font-semibold text-slate-700">{from}</span> إلى{" "}
        <span className="font-semibold text-slate-700">{to}</span> من{" "}
        <span className="font-semibold text-slate-700">{total}</span> سجل
      </p>
      {pages > 1 && (
        <nav aria-label="الصفحات" className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={hrefFor(basePath, searchParams, page - 1)} className={cn(itemClass, "border-slate-200 bg-white hover:bg-slate-50")} aria-label="الصفحة السابقة">
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={cn(itemClass, "border-slate-100 text-slate-300")} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
          {pageList(page, pages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={hrefFor(basePath, searchParams, p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  itemClass,
                  p === page
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {p}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link href={hrefFor(basePath, searchParams, page + 1)} className={cn(itemClass, "border-slate-200 bg-white hover:bg-slate-50")} aria-label="الصفحة التالية">
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className={cn(itemClass, "border-slate-100 text-slate-300")} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
