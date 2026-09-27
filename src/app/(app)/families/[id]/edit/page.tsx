import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFamilyCase } from "@/lib/data/family";
import { getFamilyAssistanceTypes } from "@/lib/data/lookups";
import { familyCaseToForm } from "@/lib/validation/family";
import { familyTitle } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { FamilyForm } from "@/components/forms/family-form";

export const metadata: Metadata = { title: "تعديل بيانات أسرة" };

export default async function EditFamilyPage(props: PageProps<"/families/[id]/edit">) {
  await requireUser();
  const { id } = await props.params;
  const [record, types] = await Promise.all([getFamilyCase(id), getFamilyAssistanceTypes()]);
  if (!record) notFound();
  const title = familyTitle(record.father_name, record.mother_name);

  return (
    <>
      <PageHeader
        title={`تعديل: ${title}`}
        icon={<Pencil />}
        breadcrumbs={[
          { label: "الرئيسية", href: "/" },
          { label: "خدمات الأسر", href: "/families" },
          { label: title, href: `/families/${id}` },
          { label: "تعديل" },
        ]}
      />
      <FamilyForm caseId={id} defaultValues={familyCaseToForm(record)} types={types} />
    </>
  );
}
