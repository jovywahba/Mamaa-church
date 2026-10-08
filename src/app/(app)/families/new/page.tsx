import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFamilyAssistanceTypes } from "@/lib/data/lookups";
import { getServantNames } from "@/lib/data/family";
import { emptyFamilyForm } from "@/lib/validation/family";
import { PageHeader } from "@/components/ui/page-header";
import { FamilyForm } from "@/components/forms/family-form";

export const metadata: Metadata = { title: "إضافة أسرة" };

export default async function NewFamilyPage() {
  await requireUser();
  const [types, servantNames] = await Promise.all([getFamilyAssistanceTypes(), getServantNames()]);
  return (
    <>
      <PageHeader
        title="إضافة أسرة جديدة"
        description="املأ البيانات التالية ثم اضغط حفظ. الحقول المميزة بـ * مطلوبة."
        icon={<UserPlus />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "خدمات الأسر", href: "/families" }, { label: "إضافة" }]}
      />
      <FamilyForm defaultValues={emptyFamilyForm} types={types} servantNames={servantNames} />
    </>
  );
}
