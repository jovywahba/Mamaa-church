"use client";

import { useMemo } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, HandHelping, Info, NotebookPen, Phone, User, UserRound, UsersRound } from "lucide-react";
import { SectionCard } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { saveDonationCase } from "@/lib/actions/donation";
import { makeDonationFormSchema, type DonationFormValues } from "@/lib/validation/donation";
import type { DonationTypeOption, LookupOption } from "@/lib/types";
import { RepeatableList } from "./repeatable-list";
import { FormActions } from "./form-actions";
import { onInvalidToast, useSaveHandler } from "./use-save-handler";

type DonationFormProps = {
  caseId?: string;
  defaultValues: DonationFormValues;
  categories: LookupOption[];
  donationTypes: DonationTypeOption[];
};

const AGE_HINT = "اكتب السن (مثال: 45) أو سنة الميلاد (مثال: 1980)";

export function DonationForm({ caseId, defaultValues, categories, donationTypes }: DonationFormProps) {
  const cashTypeId = donationTypes.find((t) => t.is_cash)?.id;
  const otherTypeId = donationTypes.find((t) => t.is_other)?.id;
  const schema = useMemo(() => makeDonationFormSchema(cashTypeId), [cashTypeId]);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DonationFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });
  const children = useFieldArray({ control, name: "children" });
  const selected = useWatch({ control, name: "category_ids" });
  const otherId = categories.find((c) => c.is_other)?.id;
  const selectedTypes = useWatch({ control, name: "donation_type_ids" });
  const isCash = Boolean(cashTypeId && selectedTypes.includes(cashTypeId));
  const isOtherType = Boolean(otherTypeId && selectedTypes.includes(otherTypeId));
  const { saving, save } = useSaveHandler("/donations");

  const onSubmit = (values: DonationFormValues) => save(() => saveDonationCase(caseId ?? null, values));

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidToast)} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="بيانات الأب" icon={<User />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الأب" htmlFor="father_name" error={errors.father_name?.message} className="sm:col-span-2" required>
              <Input id="father_name" {...register("father_name")} invalid={!!errors.father_name} />
            </Field>
            <Field label="السن أو سنة الميلاد" htmlFor="father_age_or_year" error={errors.father_age_or_year?.message} hint={AGE_HINT}>
              <Input id="father_age_or_year" inputMode="numeric" {...register("father_age_or_year")} invalid={!!errors.father_age_or_year} />
            </Field>
            <Field label="العمل" htmlFor="father_job" error={errors.father_job?.message}>
              <Input id="father_job" {...register("father_job")} invalid={!!errors.father_job} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="بيانات الأم" icon={<UserRound />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الأم" htmlFor="mother_name" error={errors.mother_name?.message} className="sm:col-span-2">
              <Input id="mother_name" {...register("mother_name")} invalid={!!errors.mother_name} />
            </Field>
            <Field label="السن أو سنة الميلاد" htmlFor="mother_age_or_year" error={errors.mother_age_or_year?.message} hint={AGE_HINT}>
              <Input id="mother_age_or_year" inputMode="numeric" {...register("mother_age_or_year")} invalid={!!errors.mother_age_or_year} />
            </Field>
            <Field label="العمل" htmlFor="mother_job" error={errors.mother_job?.message}>
              <Input id="mother_job" {...register("mother_job")} invalid={!!errors.mother_job} />
            </Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="الأولاد"
        icon={<UsersRound />}
        description={children.fields.length ? `${children.fields.length} من الأبناء` : "يمكن إضافة أي عدد من الأبناء"}
      >
        <RepeatableList
          items={children.fields}
          addLabel="إضافة ابن / ابنة"
          emptyText="لم تتم إضافة أبناء بعد"
          itemTitle={(i) => `الابن / الابنة ${i + 1}`}
          onAdd={() => children.append({ name: "", age_or_year: "", job: "" }, { shouldFocus: true })}
          onRemove={children.remove}
          renderItem={(_, i) => {
            const e = errors.children?.[i];
            return (
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="الاسم" htmlFor={`children.${i}.name`} error={e?.name?.message} className="sm:col-span-2" required>
                  <Input id={`children.${i}.name`} {...register(`children.${i}.name`)} invalid={!!e?.name} />
                </Field>
                <Field label="العمر أو سنة الميلاد" htmlFor={`children.${i}.age_or_year`} error={e?.age_or_year?.message}>
                  <Input id={`children.${i}.age_or_year`} inputMode="numeric" {...register(`children.${i}.age_or_year`)} invalid={!!e?.age_or_year} />
                </Field>
                <Field label="العمل" htmlFor={`children.${i}.job`} error={e?.job?.message}>
                  <Input id={`children.${i}.job`} {...register(`children.${i}.job`)} invalid={!!e?.job} />
                </Field>
              </div>
            );
          }}
        />
      </SectionCard>

      <SectionCard title="الاتصال" icon={<Phone />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم موبايل الأب" htmlFor="father_phone" error={errors.father_phone?.message}>
            <Input id="father_phone" type="tel" dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" className="text-start" {...register("father_phone")} invalid={!!errors.father_phone} />
          </Field>
          <Field label="رقم موبايل الأم" htmlFor="mother_phone" error={errors.mother_phone?.message}>
            <Input id="mother_phone" type="tel" dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" className="text-start" {...register("mother_phone")} invalid={!!errors.mother_phone} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="معلومات إضافية" icon={<Info />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="الحالة من طرف" htmlFor="referred_by" error={errors.referred_by?.message} hint="اسم الشخص أو الجهة التي قدمت الحالة">
            <Input id="referred_by" {...register("referred_by")} invalid={!!errors.referred_by} />
          </Field>
          <Field label="ملاحظات" htmlFor="notes" error={errors.notes?.message} className="lg:row-span-2">
            <Textarea id="notes" rows={4} {...register("notes")} invalid={!!errors.notes} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="تفاصيل التبرع" icon={<Gift />} description="يمكن اختيار نوع واحد أو أكثر">
        <div className="space-y-5">
          <Field label="تاريخ التبرع" htmlFor="donation_date" error={errors.donation_date?.message} className="max-w-xs">
            <Input id="donation_date" type="date" {...register("donation_date")} invalid={!!errors.donation_date} />
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-slate-700">
              نوع التبرع
              <span className="ms-1 text-red-500" aria-hidden>
                *
              </span>
            </span>
            <Controller
              control={control}
              name="donation_type_ids"
              render={({ field }) => (
                <CheckboxGroup
                  name="donation_type_ids"
                  columns={3}
                  options={donationTypes.map((t) => ({ value: t.id, label: t.name_ar }))}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.donation_type_ids}
                />
              )}
            />
            {errors.donation_type_ids && (
              <p className="text-xs font-medium text-red-600" role="alert">
                {errors.donation_type_ids.message}
              </p>
            )}
          </div>
          {(isCash || isOtherType) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {isCash && (
                <Field label="المبلغ (بالجنيه)" htmlFor="cash_amount" error={errors.cash_amount?.message} hint="قيمة التبرع النقدي" required>
                  <Input
                    id="cash_amount"
                    inputMode="decimal"
                    dir="ltr"
                    className="text-start"
                    placeholder="0"
                    {...register("cash_amount")}
                    invalid={!!errors.cash_amount}
                  />
                </Field>
              )}
              {isOtherType && (
                <Field label="تفاصيل التبرعات الأخرى" htmlFor="other_donation_type" error={errors.other_donation_type?.message}>
                  <Input id="other_donation_type" placeholder="اكتب نوع التبرع" {...register("other_donation_type")} />
                </Field>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="المساعدة موجهة إلى" icon={<HandHelping />} description="يمكن اختيار جهة واحدة أو أكثر">
        <Controller
          control={control}
          name="category_ids"
          render={({ field }) => (
            <CheckboxGroup
              name="category_ids"
              columns={3}
              options={categories.map((c) => ({ value: c.id, label: c.name_ar }))}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.category_ids}
            />
          )}
        />
        {errors.category_ids && (
          <p className="mt-2 text-xs font-medium text-red-600" role="alert">
            {errors.category_ids.message}
          </p>
        )}
        {(otherId && selected.includes(otherId)) || defaultValues.other_category ? (
          <Field label="أخرى (حدد)" htmlFor="other_category" error={errors.other_category?.message} className="mt-4">
            <Input id="other_category" placeholder="اكتب الجهة الموجهة إليها المساعدة" {...register("other_category")} />
          </Field>
        ) : null}
      </SectionCard>

      <SectionCard title="ملاحظات إضافية" icon={<NotebookPen />}>
        <Field label="ملاحظات إضافية عند الحاجة" htmlFor="additional_notes" error={errors.additional_notes?.message}>
          <Textarea id="additional_notes" rows={3} {...register("additional_notes")} invalid={!!errors.additional_notes} />
        </Field>
      </SectionCard>

      <FormActions submitting={saving} cancelHref={caseId ? `/donations/${caseId}` : "/donations"} />
    </form>
  );
}
