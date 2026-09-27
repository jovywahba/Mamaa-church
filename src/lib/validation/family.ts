import { z } from "zod";
import {
  MAX_LONG_TEXT,
  ageOrYearField,
  ageOrYearToInput,
  emptyToNull,
  parseAgeOrYear,
  phoneField,
  text,
  uuidList,
} from "./common";
import { normalizePhone, toLatinDigits } from "@/lib/utils";
import type { FamilyCase } from "@/lib/types";

/** Children: an age up to 80 (DB limit for this section) or a birth year. */
const childAgeOrYearField = ageOrYearField.refine((v) => {
  const parsed = parseAgeOrYear(v);
  return !parsed || parsed.age === null || parsed.age <= 80;
}, "العمر غير صحيح");

const serviceDateField = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "تاريخ الخدمة غير صحيح");

export function parseAmount(v: string): number | null {
  const s = toLatinDigits(v.trim()).replace(/[,،\s]/g, "");
  return s === "" ? null : Number(s);
}

const expenseField = z
  .string()
  .trim()
  .refine((v) => {
    const s = toLatinDigits(v).replace(/[,،\s]/g, "");
    return s === "" || (/^\d{1,10}(\.\d{1,2})?$/.test(s) && Number(s) >= 0);
  }, "يرجى إدخال مبلغ صحيح بالجنيه (مثال: 1500)");

export const familyChildSchema = z.object({
  name: text().min(1, "يرجى إدخال اسم الابن / الابنة"),
  age_or_year: childAgeOrYearField,
  education_stage: text(100),
});

export const familyFormSchema = z
  .object({
    father_name: text(),
    father_age_or_year: ageOrYearField,
    father_job: text(),
    mother_name: text(),
    mother_age_or_year: ageOrYearField,
    mother_job: text(),
    children: z.array(familyChildSchema).max(30, "الحد الأقصى 30 ابن / ابنة"),
    address: text(500),
    phones: z.array(z.object({ value: phoneField })).max(10),
    notes: text(MAX_LONG_TEXT),
    type_ids: uuidList.min(1, "يرجى اختيار نوع مساعدة واحد على الأقل"),
    other_assistance: text(500),
    service_date: serviceDateField,
    expense_amount: expenseField,
  })
  .superRefine((data, ctx) => {
    if (!data.father_name && !data.mother_name) {
      ctx.addIssue({ code: "custom", path: ["father_name"], message: "يرجى إدخال اسم الأب (أو اسم الأم على الأقل)" });
    }
  });

export type FamilyFormValues = z.infer<typeof familyFormSchema>;

export const emptyFamilyForm: FamilyFormValues = {
  father_name: "",
  father_age_or_year: "",
  father_job: "",
  mother_name: "",
  mother_age_or_year: "",
  mother_job: "",
  children: [],
  address: "",
  phones: [{ value: "" }],
  notes: "",
  type_ids: [],
  other_assistance: "",
  service_date: "",
  expense_amount: "",
};

export function familyCaseToForm(c: FamilyCase): FamilyFormValues {
  return {
    father_name: c.father_name ?? "",
    father_age_or_year: ageOrYearToInput(c.father_age, c.father_birth_year),
    father_job: c.father_job ?? "",
    mother_name: c.mother_name ?? "",
    mother_age_or_year: ageOrYearToInput(c.mother_age, c.mother_birth_year),
    mother_job: c.mother_job ?? "",
    children: c.children.map((ch) => ({
      name: ch.name,
      age_or_year: ageOrYearToInput(ch.age, ch.birth_year),
      education_stage: ch.education_stage ?? "",
    })),
    address: c.address ?? "",
    phones: c.phones.length ? c.phones.map((p) => ({ value: p.phone })) : [{ value: "" }],
    notes: c.notes ?? "",
    type_ids: c.types.map((t) => t.id),
    other_assistance: c.other_assistance ?? "",
    service_date: c.service_date ?? "",
    expense_amount: c.expense_amount === null ? "" : String(c.expense_amount),
  };
}

const NONE = { age: null, birth_year: null };

/** Converts validated form values to the JSON payload of `save_family_case`. */
export function familyFormToPayload(v: FamilyFormValues) {
  const father = parseAgeOrYear(v.father_age_or_year) ?? NONE;
  const mother = parseAgeOrYear(v.mother_age_or_year) ?? NONE;
  return {
    father_name: emptyToNull(v.father_name),
    father_age: father.age,
    father_birth_year: father.birth_year,
    father_job: emptyToNull(v.father_job),
    mother_name: emptyToNull(v.mother_name),
    mother_age: mother.age,
    mother_birth_year: mother.birth_year,
    mother_job: emptyToNull(v.mother_job),
    children: v.children.map((ch) => {
      const age = parseAgeOrYear(ch.age_or_year) ?? NONE;
      return { name: ch.name.trim(), age: age.age, birth_year: age.birth_year, education_stage: emptyToNull(ch.education_stage) };
    }),
    address: emptyToNull(v.address),
    phones: v.phones.map((p) => normalizePhone(p.value)).filter(Boolean),
    notes: emptyToNull(v.notes),
    type_ids: v.type_ids,
    other_assistance: emptyToNull(v.other_assistance),
    service_date: emptyToNull(v.service_date),
    expense_amount: parseAmount(v.expense_amount),
  };
}
