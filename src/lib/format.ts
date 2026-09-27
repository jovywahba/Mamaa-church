const TIME_ZONE = "Africa/Cairo";

const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function currentYear(): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
}

/** Arabic counting: 1 سنة، 2 سنتان، 3–10 سنوات، otherwise سنة. */
export function yearsLabel(n: number): string {
  if (n === 0) return "أقل من سنة";
  if (n === 1) return "سنة واحدة";
  if (n === 2) return "سنتان";
  if (n >= 3 && n <= 10) return `${n} سنوات`;
  return `${n} سنة`;
}

export function formatAge(age: number | null | undefined): string {
  if (age === null || age === undefined) return "—";
  return yearsLabel(age);
}

/** For donation records that store either an age or a birth year. */
export function formatAgeOrBirthYear(age: number | null, birthYear: number | null): string {
  if (age !== null && age !== undefined) return yearsLabel(age);
  if (birthYear) {
    const approx = currentYear() - birthYear;
    return `مواليد ${birthYear} (حوالي ${yearsLabel(approx)})`;
  }
  return "—";
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

export function familyTitle(father: string | null, mother: string | null): string {
  if (father && mother) return `أسرة ${father}`;
  if (father) return `أسرة ${father}`;
  if (mother) return `أسرة ${mother}`;
  return "بدون اسم";
}
