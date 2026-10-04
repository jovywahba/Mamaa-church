import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDonationCase } from "@/lib/data/donation";
import { getDonationCategories, getDonationTypes } from "@/lib/data/lookups";
import { donationCaseToForm } from "@/lib/validation/donation";
import { familyTitle } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { DonationForm } from "@/components/forms/donation-form";

export const metadata: Metadata = { title: "تعديل حالة تبرع" };

export default async function EditDonationPage(props: PageProps<"/donations/[id]/edit">) {
  await requireUser();
  const { id } = await props.params;
  const [record, categories, donationTypes] = await Promise.all([getDonationCase(id), getDonationCategories(), getDonationTypes()]);
  if (!record) notFound();
  const title = familyTitle(record.father_name, record.mother_name);

  return (
    <>
      <PageHeader
        title={`تعديل: ${title}`}
        icon={<Pencil />}
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "التبرعات", href: "/donations" },
          { label: title, href: `/donations/${id}` },
          { label: "تعديل" },
        ]}
      />
      <DonationForm caseId={id} defaultValues={donationCaseToForm(record)} categories={categories} donationTypes={donationTypes} />
    </>
  );
}
