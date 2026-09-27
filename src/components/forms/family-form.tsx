"use client";

import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandHelping, MapPin, NotebookPen, Plus, Trash2, User, UserRound, UsersRound } from "lucide-react";
import { SectionCard } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Button } from "@/components/ui/button";
import { saveFamilyCase } from "@/lib/actions/family";
import { EDUCATION_STAGES } from "@/lib/constants";
import { familyFormSchema, type FamilyFormValues } from "@/lib/validation/family";
import type { LookupOption } from "@/lib/types";
import { RepeatableList } from "./repeatable-list";
import { FormActions } from "./form-actions";
import { onInvalidToast, useSaveHandler } from "./use-save-handler";

type FamilyFormProps = {
  caseId?: string;
  defaultValues: FamilyFormValues;
  types: LookupOption[];
};

export function FamilyForm({ caseId, defaultValues, types }: FamilyFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FamilyFormValues>({
    resolver: zodResolver(familyFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const children = useFieldArray({ control, name: "children" });
  const phones = useFieldArray({ control, name: "phones" });
  const selectedTypes = useWatch({ control, name: "type_ids" });
  const otherTypeId = types.find((t) => t.is_other)?.id;
  const { saving, save } = useSaveHandler("/families");

  const onSubmit = (values: FamilyFormValues) => save(() => saveFamilyCase(caseId ?? null, values));

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidToast)} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="بيانات الأب" icon={<User />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="اسم الأب" htmlFor="father_name" error={errors.father_name?.message} className="sm:col-span-3" required>
              <Input id="father_name" {...register("father_name")} invalid={!!errors.father_name} />
            </Field>
            <Field label="سن الأب" htmlFor="father_age" error={errors.father_age?.message}>
              <Input id="father_age" inputMode="numeric" {...register("father_age")} invalid={!!errors.father_age} />
            </Field>
            <Field label="عمل الأب" htmlFor="father_job" error={errors.father_job?.message} className="sm:col-span-2">
              <Input id="father_job" {...register("father_job")} invalid={!!errors.father_job} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="بيانات الأم" icon={<UserRound />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="اسم الأم" htmlFor="mother_name" error={errors.mother_name?.message} className="sm:col-span-3">
              <Input id="mother_name" {...register("mother_name")} invalid={!!errors.mother_name} />
            </Field>
            <Field label="سن الأم" htmlFor="mother_age" error={errors.mother_age?.message}>
              <Input id="mother_age" inputMode="numeric" {...register("mother_age")} invalid={!!errors.mother_age} />
            </Field>
            <Field label="عمل الأم" htmlFor="mother_job" error={errors.mother_job?.message} className="sm:col-span-2">
              <Input id="mother_job" {...register("mother_job")} invalid={!!errors.mother_job} />
            </Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="بيانات الأولاد"
        icon={<UsersRound />}
        description={children.fields.length ? `${children.fields.length} من الأبناء` : "يمكن إضافة أي عدد من الأبناء"}
      >
        <RepeatableList
          items={children.fields}
          addLabel="إضافة ابن / ابنة"
          emptyText="لم تتم إضافة أبناء بعد"
          itemTitle={(i) => `الابن / الابنة ${i + 1}`}
          onAdd={() => children.append({ name: "", age: "", education_stage: "" }, { shouldFocus: true })}
          onRemove={children.remove}
          renderItem={(_, i) => {
            const e = errors.children?.[i];
            return (
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="الاسم" htmlFor={`children.${i}.name`} error={e?.name?.message} className="sm:col-span-2" required>
                  <Input id={`children.${i}.name`} {...register(`children.${i}.name`)} invalid={!!e?.name} />
                </Field>
                <Field label="العمر" htmlFor={`children.${i}.age`} error={e?.age?.message}>
                  <Input id={`children.${i}.age`} inputMode="numeric" {...register(`children.${i}.age`)} invalid={!!e?.age} />
                </Field>
                <Field label="المرحلة التعليمية" htmlFor={`children.${i}.education_stage`} error={e?.education_stage?.message}>
                  <Select id={`children.${i}.education_stage`} {...register(`children.${i}.education_stage`)}>
                    <option value="">— اختر —</option>
                    {EDUCATION_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            );
          }}
        />
        {errors.children?.message && <p className="mt-2 text-xs text-red-600">{errors.children.message}</p>}
      </SectionCard>

      <SectionCard title="بيانات التواصل والعنوان" icon={<MapPin />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Field label="العنوان" htmlFor="address" error={errors.address?.message}>
            <Textarea id="address" rows={4} {...register("address")} invalid={!!errors.address} />
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-slate-700">أرقام الموبايلات</span>
            <div className="space-y-2">
              {phones.fields.map((f, i) => {
                const err = errors.phones?.[i]?.value?.message;
                return (
                  <div key={f.id}>
                    <div className="flex gap-2">
                      <label htmlFor={`phones.${i}.value`} className="sr-only">
                        رقم الموبايل {i + 1}
                      </label>
                      <Input
                        id={`phones.${i}.value`}
                        type="tel"
                        dir="ltr"
                        inputMode="tel"
                        placeholder="01xxxxxxxxx"
                        className="text-start"
                        {...register(`phones.${i}.value`)}
                        invalid={!!err}
                      />
                      {phones.fields.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => phones.remove(i)} aria-label={`حذف الرقم ${i + 1}`} className="size-10 text-slate-400 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    {err && <p className="mt-1 text-xs font-medium text-red-600">{err}</p>}
                  </div>
                );
              })}
            </div>
            {phones.fields.length < 10 && (
              <Button variant="ghost" size="sm" onClick={() => phones.append({ value: "" }, { shouldFocus: true })} className="text-primary-700">
                <Plus className="size-4" aria-hidden />
                إضافة رقم آخر
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="تفاصيل المساعدة" icon={<HandHelping />} description="يمكن اختيار نوع واحد أو أكثر">
        <Controller
          control={control}
          name="type_ids"
          render={({ field }) => (
            <CheckboxGroup
              name="type_ids"
              columns={3}
              options={types.map((t) => ({ value: t.id, label: t.name_ar }))}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.type_ids}
            />
          )}
        />
        {errors.type_ids && (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {errors.type_ids.message}
          </p>
        )}
        {(otherTypeId && selectedTypes.includes(otherTypeId)) || defaultValues.other_assistance ? (
          <Field label="تفاصيل المساعدة الأخرى" htmlFor="other_assistance" error={errors.other_assistance?.message} className="mt-4">
            <Input id="other_assistance" placeholder="اكتب نوع المساعدة" {...register("other_assistance")} />
          </Field>
        ) : null}
      </SectionCard>

      <SectionCard title="الملاحظات" icon={<NotebookPen />}>
        <Field label="ملاحظات" htmlFor="notes" error={errors.notes?.message}>
          <Textarea id="notes" rows={4} {...register("notes")} invalid={!!errors.notes} />
        </Field>
      </SectionCard>

      <FormActions submitting={saving} cancelHref={caseId ? `/families/${caseId}` : "/families"} />
    </form>
  );
}

