import { z } from "zod";
import { currentYear } from "@/lib/format";
import { normalizePhone, toLatinDigits } from "@/lib/utils";

export const MAX_TEXT = 300;
export const MAX_LONG_TEXT = 5000;

export const text = (max = MAX_TEXT) => z.string().trim().max(max, `الحد الأقصى ${max} حرف`);

export const ageField = (max: number, message = "العمر غير صحيح") =>
  z.string().trim().refine((v) => {
    if (v === "") return true;
    const n = toLatinDigits(v);
    return /^\d{1,3}$/.test(n) && Number(n) <= max;
  }, message);

/** "السن أو سنة الميلاد" — accepts an age (0–130) or a year (1900–current year). */
export const ageOrYearField = z
  .string()
  .trim()
  .refine((v) => v === "" || parseAgeOrYear(v) !== null, "يرجى إدخال سن صحيح أو سنة ميلاد (مثال: 45 أو 1980)");

export const phoneField = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?\d{6,15}$/.test(normalizePhone(v)), "رقم الهاتف غير صحيح");

export const uuidList = z.array(z.string().regex(/^[0-9a-f-]{36}$/i));

export function toIntOrNull(v: string): number | null {
  const n = toLatinDigits(v.trim());
  return n === "" ? null : Number(n);
}

export function parseAgeOrYear(v: string): { age: number | null; birth_year: number | null } | null {
  const n = toLatinDigits(v.trim());
  if (n === "") return { age: null, birth_year: null };
  if (!/^\d{1,4}$/.test(n)) return null;
  const value = Number(n);
  if (value <= 130) return { age: value, birth_year: null };
  if (value >= 1900 && value <= currentYear()) return { age: null, birth_year: value };
  return null;
}

export function ageOrYearToInput(age: number | null, birthYear: number | null): string {
  if (age !== null && age !== undefined) return String(age);
  if (birthYear) return String(birthYear);
  return "";
}

export function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}
