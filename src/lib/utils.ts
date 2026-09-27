import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** Converts Arabic-Indic / Persian digits to Latin digits. */
export function toLatinDigits(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** Strips spaces, dashes and brackets from a phone number. */
export function normalizePhone(value: string): string {
  return toLatinDigits(value).replace(/[\s\-().]/g, "");
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
