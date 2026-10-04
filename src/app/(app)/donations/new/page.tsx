import type { Metadata } from "next";
import { HandHeart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDonationCategories, getDonationTypes } from "@/lib/data/lookups";
import { todayIso } from "@/lib/format";
import { emptyDonationForm } from "@/lib/validation/donation";
import { PageHeader } from "@/components/ui/page-header";
import { DonationForm } from "@/components/forms/donation-form";

export const metadata: Metadata = { title: "إضافة حالة تبرع" };

export default async function NewDonationPage() {
  await requireUser();
  const [categories, donationTypes] = await Promise.all([getDonationCategories(), getDonationTypes()]);
  return (
    <>
      <PageHeader
        title="إضافة حالة تبرع جديدة"
        description="املأ البيانات التالية ثم اضغط حفظ. الحقول المميزة بـ * مطلوبة."
        icon={<HandHeart />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "التبرعات", href: "/donations" }, { label: "إضافة" }]}
      />
      <DonationForm defaultValues={{ ...emptyDonationForm, donation_date: todayIso() }} categories={categories} donationTypes={donationTypes} />
    </>
  );
}
