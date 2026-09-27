"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandHeart, Loader2, Search, UsersRound } from "lucide-react";
import { quickSearch } from "@/lib/actions/search";
import { familyTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function resultHref(r: Pick<SearchResult, "kind" | "id">) {
  return r.kind === "family" ? `/families/${r.id}` : `/donations/${r.id}`;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const listId = useId();

  // Debounced live suggestions.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const data = await quickSearch(q);
        if (id === requestId.current) {
          setResults(data);
          setActive(-1);
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(resultHref(results[active]));
    const q = query.trim();
    if (q) go(`/search?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form role="search" onSubmit={onSubmit}>
        <label htmlFor="global-search" className="sr-only">
          بحث شامل
        </label>
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="global-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ابحث بالاسم، رقم الهاتف، العنوان..."
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 ps-10 pe-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:outline-none"
        />
        {pending && (
          <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
        )}
      </form>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-slate-500">
              {pending ? "جاري البحث..." : "لا توجد نتائج مطابقة"}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(resultHref(r))}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-start",
                      i === active ? "bg-slate-50" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        r.kind === "family" ? "bg-primary-50 text-primary-700" : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {r.kind === "family" ? <UsersRound className="size-4" /> : <HandHeart className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {familyTitle(r.father_name, r.mother_name)}
                        {r.mother_name && r.father_name && (
                          <span className="font-normal text-slate-500"> — {r.mother_name}</span>
                        )}
                      </span>
                      {r.details && <span className="block truncate text-xs text-slate-500">{r.details}</span>}
                    </span>
                    <Badge tone={r.kind === "family" ? "primary" : "green"}>
                      {r.kind === "family" ? "خدمات الأسر" : "التبرعات"}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
            className="block w-full cursor-pointer border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-primary-700 hover:bg-slate-100"
          >
            عرض كل النتائج لـ &quot;{query.trim()}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
