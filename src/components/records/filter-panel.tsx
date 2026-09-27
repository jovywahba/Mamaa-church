"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, FilterX, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import type { FilterField } from "./filter-types";

type FilterPanelProps = {
  fields: FilterField[];
  searchPlaceholder: string;
};

function fieldKeys(fields: FilterField[]): string[] {
  return fields.flatMap((f) =>
    f.type === "number-range" ? [f.minName, f.maxName] : f.type === "date-range" ? [f.fromName, f.toName] : [f.name],
  );
}

/**
 * URL-driven search + filters. The text search applies automatically (debounced);
 * the other filters apply on "تطبيق الفلاتر". State lives in the query string so
 * results are shareable and survive refreshes.
 */
export function FilterPanel({ fields, searchPlaceholder }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const keys = useMemo(() => fieldKeys(fields), [fields]);

  const readValues = () => Object.fromEntries(keys.map((k) => [k, searchParams.get(k) ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(readValues);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const activeCount = keys.filter((k) => searchParams.get(k)).length;
  const [open, setOpen] = useState(activeCount > 0);

  // Keep local state in sync when the URL changes (back/forward, clear, etc.).
  const spKey = searchParams.toString();
  const [lastKey, setLastKey] = useState(spKey);
  if (spKey !== lastKey) {
    setLastKey(spKey);
    setValues(readValues());
    setQ(searchParams.get("q") ?? "");
  }

  function navigate(next: Record<string, string>, nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    for (const [k, v] of Object.entries(next)) if (v.trim()) params.set(k, v.trim());
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounced auto-apply for the text search.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q.trim() === current.trim()) return;
    const t = setTimeout(() => navigate(readValues(), q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));
  const hasAnything = activeCount > 0 || Boolean(searchParams.get("q"));

  return (
    <div className="border-b border-slate-100 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate(values, q);
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="list-search" className="sr-only">
              بحث
            </label>
            <Input
              id="list-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="ps-9"
            />
            {pending && (
              <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={open ? "secondary" : "outline"}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex-1 sm:flex-none"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              الفلاتر
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">
                  {activeCount}
                </span>
              )}
            </Button>
            {hasAnything && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setValues(Object.fromEntries(keys.map((k) => [k, ""])));
                  navigate({}, "");
                }}
                className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 sm:flex-none"
              >
                <FilterX className="size-4" aria-hidden />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>

        <div className={cn("grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4", !open && "hidden")}>
          {fields.map((f) => (
            <div key={f.name} className={cn("space-y-1.5", (f.type === "multi" || f.type === "date-range") && "lg:col-span-2")}>
              <label htmlFor={`f-${f.name}`} className="block text-xs font-semibold text-slate-600">
                {f.label}
              </label>
              {f.type === "text" && (
                <Input
                  id={`f-${f.name}`}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  dir={f.dir}
                  className={f.dir === "ltr" ? "text-start" : undefined}
                />
              )}
              {f.type === "date" && (
                <Input id={`f-${f.name}`} type="date" value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />
              )}
              {f.type === "date-range" && (
                <div className="flex items-center gap-2">
                  <Input
                    id={`f-${f.name}`}
                    type="date"
                    aria-label="من تاريخ"
                    value={values[f.fromName] ?? ""}
                    max={values[f.toName] || undefined}
                    onChange={(e) => set(f.fromName, e.target.value)}
                  />
                  <span className="text-xs text-slate-500">إلى</span>
                  <Input
                    type="date"
                    aria-label="إلى تاريخ"
                    value={values[f.toName] ?? ""}
                    min={values[f.fromName] || undefined}
                    onChange={(e) => set(f.toName, e.target.value)}
                  />
                </div>
              )}
              {f.type === "number-range" && (
                <div className="flex items-center gap-2">
                  <Input
                    id={`f-${f.name}`}
                    inputMode="numeric"
                    aria-label={`${f.label} من`}
                    placeholder="من"
                    value={values[f.minName] ?? ""}
                    onChange={(e) => set(f.minName, e.target.value.replace(/\D/g, "").slice(0, 3))}
                  />
                  <span className="text-xs text-slate-500">إلى</span>
                  <Input
                    inputMode="numeric"
                    aria-label={`${f.label} إلى`}
                    placeholder="إلى"
                    value={values[f.maxName] ?? ""}
                    onChange={(e) => set(f.maxName, e.target.value.replace(/\D/g, "").slice(0, 3))}
                  />
                </div>
              )}
              {f.type === "select" && (
                <Select id={`f-${f.name}`} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}>
                  <option value="">الكل</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
              {f.type === "multi" && (
                <MultiSelect
                  id={`f-${f.name}`}
                  options={f.options}
                  value={(values[f.name] ?? "").split(",").filter(Boolean)}
                  onChange={(v) => set(f.name, v.join(","))}
                />
              )}
            </div>
          ))}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={pending}>
              <Filter className="size-4" aria-hidden />
              تطبيق الفلاتر
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
