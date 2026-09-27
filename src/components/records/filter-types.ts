import type { Option } from "@/components/ui/checkbox-group";

export type FilterField =
  | { name: string; label: string; type: "text"; placeholder?: string; dir?: "ltr" }
  | { name: string; label: string; type: "date" }
  | { name: string; label: string; type: "number-range"; minName: string; maxName: string; maxDigits?: number }
  | { name: string; label: string; type: "date-range"; fromName: string; toName: string }
  | { name: string; label: string; type: "select"; options: Option[] }
  | { name: string; label: string; type: "multi"; options: Option[] };

type SP = Record<string, string | string[] | undefined>;

export function spString(sp: SP, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export function spList(sp: SP, key: string): string[] | undefined {
  const s = spString(sp, key);
  const list = s?.split(",").map((x) => x.trim()).filter(Boolean);
  return list && list.length ? list : undefined;
}

export function spPage(sp: SP): number {
  const n = Number(spString(sp, "page") ?? "1");
  return Number.isInteger(n) && n > 0 ? n : 1;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function spDate(sp: SP, key: string): string | undefined {
  const s = spString(sp, key);
  return s && DATE.test(s) ? s : undefined;
}

export function spInt(sp: SP, key: string, maxDigits = 3): string | undefined {
  const s = spString(sp, key);
  return s && new RegExp(`^\\d{1,${maxDigits}}$`).test(s) ? s : undefined;
}

/** Keys (other than q/page) that count as an active filter. */
export function activeFilterCount(sp: SP, fields: FilterField[]): number {
  let n = 0;
  for (const f of fields) {
    if (f.type === "number-range") n += spString(sp, f.minName) || spString(sp, f.maxName) ? 1 : 0;
    else if (f.type === "date-range") n += spString(sp, f.fromName) || spString(sp, f.toName) ? 1 : 0;
    else n += spString(sp, f.name) ? 1 : 0;
  }
  return n;
}
