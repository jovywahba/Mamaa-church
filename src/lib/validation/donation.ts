import { z } from "zod";
import {
  MAX_LONG_TEXT,
  amountField,
  dateField,
  parseAmount,
  ageOrYearField,
  ageOrYearToInput,
  emptyToNull,
  parseAgeOrYear,
  phoneField,
  text,
  uuidList,
} from "./common";
import { normalizePhone } from "@/lib/utils";
import type { DonationCase } from "@/lib/types";

export const donationChildSchema = z.object({
  name: text().min(1, "يرجى إدخال اسم الابن / الابنة"),
  age_or_year: ageOrYearField,
  job: text(),
});

/**
 * Builds the donation form schema. In the browser the id of the «نقدي» type is
 * passed so a missing amount is caught before submitting; the server (and the
 * save_donation_case RPC) enforce the same rule independently.
 */
export function makeDonationFormSchema(cashTypeId?: string) {
  return z
    .object({
      father_name: text(),
      father_age_or_year: ageOrYearField,
      father_job: text(),
      mother_name: text(),
      mother_age_or_year: ageOrYearField,
      mother_job: text(),
      children: z.array(donationChildSchema).max(30, "الحد الأقصى 30 ابن / ابنة"),
      father_phone: phoneField,
      mother_phone: phoneField,
      notes: text(MAX_LONG_TEXT),
      referred_by: text(),
      category_ids: uuidList.min(1, "يرجى اختيار جهة واحدة على الأقل للمساعدة"),
      other_category: text(500),
      additional_notes: text(MAX_LONG_TEXT),
      donation_date: dateField("تاريخ التبرع غير صحيح"),
      donation_type_ids: uuidList.min(1, "يرجى اختيار نوع التبرع"),
      cash_amount: amountField(),
      other_donation_type: text(500),
    })
    .superRefine((data, ctx) => {
      if (!data.father_name && !data.mother_name) {
        ctx.addIssue({ code: "custom", path: ["father_name"], message: "يرجى إدخال اسم الأب (أو اسم الأم على الأقل)" });
      }
      if (cashTypeId && data.donation_type_ids.includes(cashTypeId) && !data.cash_amount.trim()) {
        ctx.addIssue({ code: "custom", path: ["cash_amount"], message: "يرجى إدخال مبلغ التبرع النقدي" });
      }
    });
}

export const donationFormSchema = makeDonationFormSchema();

export type DonationFormValues = z.infer<typeof donationFormSchema>;

export const emptyDonationForm: DonationFormValues = {
  father_name: "",
  father_age_or_year: "",
  father_job: "",
  mother_name: "",
  mother_age_or_year: "",
  mother_job: "",
  children: [],
  father_phone: "",
  mother_phone: "",
  notes: "",
  referred_by: "",
  category_ids: [],
  other_category: "",
  additional_notes: "",
  donation_date: "",
  donation_type_ids: [],
  cash_amount: "",
  other_donation_type: "",
};

export function donationCaseToForm(c: DonationCase): DonationFormValues {
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
      job: ch.job ?? "",
    })),
    father_phone: c.father_phone ?? "",
    mother_phone: c.mother_phone ?? "",
    notes: c.notes ?? "",
    referred_by: c.referred_by ?? "",
    category_ids: c.categories.map((cat) => cat.id),
    other_category: c.other_category ?? "",
    additional_notes: c.additional_notes ?? "",
    donation_date: c.donation_date ?? "",
    donation_type_ids: c.donation_types.map((t) => t.id),
    cash_amount: c.cash_amount === null ? "" : String(c.cash_amount),
    other_donation_type: c.other_donation_type ?? "",
  };
}

export function donationFormToPayload(v: DonationFormValues) {
  const father = parseAgeOrYear(v.father_age_or_year) ?? { age: null, birth_year: null };
  const mother = parseAgeOrYear(v.mother_age_or_year) ?? { age: null, birth_year: null };
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
      const parsed = parseAgeOrYear(ch.age_or_year) ?? { age: null, birth_year: null };
      return { name: ch.name.trim(), age: parsed.age, birth_year: parsed.birth_year, job: emptyToNull(ch.job) };
    }),
    father_phone: emptyToNull(normalizePhone(v.father_phone)),
    mother_phone: emptyToNull(normalizePhone(v.mother_phone)),
    notes: emptyToNull(v.notes),
    referred_by: emptyToNull(v.referred_by),
    category_ids: v.category_ids,
    other_category: emptyToNull(v.other_category),
    additional_notes: emptyToNull(v.additional_notes),
    donation_date: emptyToNull(v.donation_date),
    donation_type_ids: v.donation_type_ids,
    cash_amount: parseAmount(v.cash_amount),
    other_donation_type: emptyToNull(v.other_donation_type),
  };
}
