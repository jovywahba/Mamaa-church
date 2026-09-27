import { z } from "zod";
import { MAX_LONG_TEXT, ageField, emptyToNull, phoneField, text, toIntOrNull, uuidList } from "./common";
import { normalizePhone } from "@/lib/utils";
import type { FamilyCase } from "@/lib/types";

export const familyChildSchema = z.object({
  name: text().min(1, "يرجى إدخال اسم الابن / الابنة"),
  age: ageField(80),
  education_stage: text(100),
});

export const familyFormSchema = z
  .object({
    father_name: text(),
    father_age: ageField(130, "سن الأب غير صحيح"),
    father_job: text(),
    mother_name: text(),
    mother_age: ageField(130, "سن الأم غير صحيح"),
    mother_job: text(),
    children: z.array(familyChildSchema).max(30, "الحد الأقصى 30 ابن / ابنة"),
    address: text(500),
    phones: z.array(z.object({ value: phoneField })).max(10),
    notes: text(MAX_LONG_TEXT),
    type_ids: uuidList.min(1, "يرجى اختيار نوع مساعدة واحد على الأقل"),
    other_assistance: text(500),
  })
  .superRefine((data, ctx) => {
    if (!data.father_name && !data.mother_name) {
      ctx.addIssue({ code: "custom", path: ["father_name"], message: "يرجى إدخال اسم الأب (أو اسم الأم على الأقل)" });
    }
  });

export type FamilyFormValues = z.infer<typeof familyFormSchema>;

export const emptyFamilyForm: FamilyFormValues = {
  father_name: "",
  father_age: "",
  father_job: "",
  mother_name: "",
  mother_age: "",
  mother_job: "",
  children: [],
  address: "",
  phones: [{ value: "" }],
  notes: "",
  type_ids: [],
  other_assistance: "",
};

export function familyCaseToForm(c: FamilyCase): FamilyFormValues {
  return {
    father_name: c.father_name ?? "",
    father_age: c.father_age?.toString() ?? "",
    father_job: c.father_job ?? "",
    mother_name: c.mother_name ?? "",
    mother_age: c.mother_age?.toString() ?? "",
    mother_job: c.mother_job ?? "",
    children: c.children.map((ch) => ({
      name: ch.name,
      age: ch.age?.toString() ?? "",
      education_stage: ch.education_stage ?? "",
    })),
    address: c.address ?? "",
    phones: c.phones.length ? c.phones.map((p) => ({ value: p.phone })) : [{ value: "" }],
    notes: c.notes ?? "",
    type_ids: c.types.map((t) => t.id),
    other_assistance: c.other_assistance ?? "",
  };
}

/** Converts validated form values to the JSON payload of `save_family_case`. */
export function familyFormToPayload(v: FamilyFormValues) {
  return {
    father_name: emptyToNull(v.father_name),
    father_age: toIntOrNull(v.father_age),
    father_job: emptyToNull(v.father_job),
    mother_name: emptyToNull(v.mother_name),
    mother_age: toIntOrNull(v.mother_age),
    mother_job: emptyToNull(v.mother_job),
    children: v.children.map((ch) => ({
      name: ch.name.trim(),
      age: toIntOrNull(ch.age),
      education_stage: emptyToNull(ch.education_stage),
    })),
    address: emptyToNull(v.address),
    phones: v.phones.map((p) => normalizePhone(p.value)).filter(Boolean),
    notes: emptyToNull(v.notes),
    type_ids: v.type_ids,
    other_assistance: emptyToNull(v.other_assistance),
  };
}
