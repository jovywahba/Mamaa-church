"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase, inputBorder } from "./input";
import type { Option } from "./checkbox-group";

type MultiSelectProps = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  id?: string;
};

/** Compact dropdown multi-select, used in filter bars. */
export function MultiSelect({ options, value, onChange, placeholder = "الكل", id }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputBase, inputBorder(false), "flex h-10 items-center justify-between gap-2 text-start")}
      >
        <span className={cn("truncate", !selected.length && "text-slate-400")}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
              ? selected[0].label
              : `${selected.length} مختارة`}
        </span>
        <span className="flex items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="مسح الاختيار"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-72 w-full min-w-64 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <li key={opt.value} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-start text-sm hover:bg-slate-50",
                    checked && "text-primary-800",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      checked ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300",
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="leading-snug">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
