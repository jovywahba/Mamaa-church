"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

type CheckboxGroupProps = {
  name: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
  columns?: 1 | 2 | 3;
};

/** Multi-select as a grid of large, tappable checkbox tiles. */
export function CheckboxGroup({ name, options, value, onChange, invalid, columns = 2 }: CheckboxGroupProps) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div
      role="group"
      data-invalid={invalid || undefined}
      className={cn(
        "grid gap-2",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {options.map((opt) => {
        const checked = value.includes(opt.value);
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors select-none",
              checked
                ? "border-primary-500 bg-primary-50 text-primary-900"
                : invalid
                  ? "border-red-300 bg-white hover:bg-red-50/40"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => toggle(opt.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300",
                checked ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white",
              )}
              aria-hidden
            >
              {checked && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="font-medium leading-snug">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
