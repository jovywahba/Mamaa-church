import type { Metadata } from "next";
import Link from "next/link";
import { HandHelping, Plus, UsersRound, X } from "lucide-react";
import { formatMoney, servicesLabel } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { listFamilyCases, type FamilyFilters } from "@/lib/data/family";
import { getFamilyAssistanceTypes } from "@/lib/data/lookups";
import { EDUCATION_STAGES, PAGE_SIZE, SECTION_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterPanel } from "@/components/records/filter-panel";
import { FamilyTable } from "@/components/records/family-table";
import { activeFilterCount, spDate, spInt, spList, spPage, spString, type FilterField } from "@/components/records/filter-types";

export const metadata: Metadata = { title: "خدمات الأسر" };

export default async function FamiliesPage(props: PageProps<"/families">) {
  await requireUser();
  const sp = await props.searchParams;
  const page = spPage(sp);

  const filters: FamilyFilters = {
    q: spString(sp, "q"),
    type_ids: spList(sp, "types"),
    date_from: spDate(sp, "from"),
    date_to: spDate(sp, "to"),
    father_name: spString(sp, "father"),
    mother_name: spString(sp, "mother"),
    address: spString(sp, "address"),
    parent_age_min: spInt(sp, "pmin"),
    parent_age_max: spInt(sp, "pmax"),
    child_age_min: spInt(sp, "cage_min"),
    child_age_max: spInt(sp, "cage_max"),
    education_stage: spString(sp, "stage"),
    service_from: spDate(sp, "sfrom"),
    service_to: spDate(sp, "sto"),
    expense_min: spInt(sp, "emin", 9),
    expense_max: spInt(sp, "emax", 9),
    servant_name: spString(sp, "servant"),
  };

  const [types, { rows, total, totalExpense }] = await Promise.all([getFamilyAssistanceTypes(), listFamilyCases(filters, page)]);

  const fields: FilterField[] = [
    { name: "types", label: "نوع المساعدة", type: "multi", options: types.map((t) => ({ value: t.id, label: t.name_ar })) },
    { name: "service", label: "تاريخ الخدمة", type: "date-range", fromName: "sfrom", toName: "sto" },
    { name: "expense", label: "المصاريف (جنيه)", type: "number-range", minName: "emin", maxName: "emax", maxDigits: 9 },
    { name: "date", label: "تاريخ الإضافة", type: "date-range", fromName: "from", toName: "to" },
    { name: "servant", label: "الخادم / المتبرع", type: "text" },
    { name: "father", label: "اسم الأب", type: "text" },
    { name: "mother", label: "اسم الأم", type: "text" },
    { name: "address", label: "المنطقة / العنوان", type: "text" },
    { name: "stage", label: "المرحلة التعليمية للأولاد", type: "select", options: EDUCATION_STAGES.map((s) => ({ value: s, label: s })) },
    { name: "parent_age", label: "سن الأب أو الأم", type: "number-range", minName: "pmin", maxName: "pmax" },
    { name: "child_age", label: "عمر أحد الأولاد", type: "number-range", minName: "cage_min", maxName: "cage_max" },
  ];

  const filtered = activeFilterCount(sp, fields) > 0 || Boolean(filters.q);

  return (
    <>
      <PageHeader
        title={SECTION_LABELS.family}
        description="قائمة الأسر المسجلة مع إمكانية البحث والتصفية"
        icon={<UsersRound />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "خدمات الأسر" }]}
        actions={
          <LinkButton href="/families/new">
            <Plus className="size-4" aria-hidden />
            إضافة
          </LinkButton>
        }
      />
      {filters.servant_name && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-white text-primary-700 ring-1 ring-primary-100">
              <HandHelping className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold text-primary-900">خدمات «{filters.servant_name}»</p>
              <p className="text-sm text-primary-800">
                <span className="font-semibold tabular-nums">{servicesLabel(total)}</span>
                {totalExpense !== null && (
                  <>
                    {" "}• إجمالي المصاريف <span className="font-semibold tabular-nums">{formatMoney(totalExpense)}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Link href="/families" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">
            <X className="size-4" aria-hidden />
            عرض كل الأسر
          </Link>
        </div>
      )}
      <Card className="overflow-visible">
        <FilterPanel fields={fields} searchPlaceholder="ابحث باسم الأب أو الأم أو الأولاد أو الخادم / المتبرع، رقم الهاتف، العنوان..." />
        {rows.length === 0 ? (
          filtered ? (
            <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تعديل كلمات البحث أو مسح الفلاتر." />
          ) : (
            <EmptyState
              icon={<UsersRound />}
              title="لا توجد أسر مسجلة بعد"
              description="ابدأ بإضافة أول أسرة إلى النظام."
              action={
                <LinkButton href="/families/new">
                  <Plus className="size-4" aria-hidden />
                  إضافة أسرة
                </LinkButton>
              }
            />
          )
        ) : (
          <>
            <FamilyTable rows={rows} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/families" searchParams={sp} />
          </>
        )}
      </Card>
    </>
  );
}
