import type { Metadata } from "next";
import { HandHeart, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listDonationCases, type DonationFilters } from "@/lib/data/donation";
import { getDonationCategories, getDonationTypes } from "@/lib/data/lookups";
import { PAGE_SIZE, SECTION_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { FilterPanel } from "@/components/records/filter-panel";
import { DonationTable } from "@/components/records/donation-table";
import { activeFilterCount, spDate, spList, spPage, spString, type FilterField } from "@/components/records/filter-types";

export const metadata: Metadata = { title: "التبرعات" };

export default async function DonationsPage(props: PageProps<"/donations">) {
  await requireUser();
  const sp = await props.searchParams;
  const page = spPage(sp);

  const filters: DonationFilters = {
    q: spString(sp, "q"),
    category_ids: spList(sp, "categories"),
    referred_by: spString(sp, "referred"),
    date_from: spDate(sp, "from"),
    date_to: spDate(sp, "to"),
    father_name: spString(sp, "father"),
    mother_name: spString(sp, "mother"),
    phone: spString(sp, "phone"),
    donation_type_ids: spList(sp, "dtypes"),
    donation_from: spDate(sp, "dfrom"),
    donation_to: spDate(sp, "dto"),
  };

  const [categories, donationTypes, { rows, total }] = await Promise.all([
    getDonationCategories(),
    getDonationTypes(),
    listDonationCases(filters, page),
  ]);

  const fields: FilterField[] = [
    { name: "dtypes", label: "نوع التبرع", type: "multi", options: donationTypes.map((t) => ({ value: t.id, label: t.name_ar })) },
    { name: "donation_date", label: "تاريخ التبرع", type: "date-range", fromName: "dfrom", toName: "dto" },
    { name: "categories", label: "المساعدة موجهة إلى", type: "multi", options: categories.map((c) => ({ value: c.id, label: c.name_ar })) },
    { name: "date", label: "تاريخ الإضافة", type: "date-range", fromName: "from", toName: "to" },
    { name: "referred", label: "الحالة من طرف", type: "text" },
    { name: "father", label: "اسم الأب", type: "text" },
    { name: "mother", label: "اسم الأم", type: "text" },
    { name: "phone", label: "رقم الهاتف", type: "text", dir: "ltr", placeholder: "01xxxxxxxxx" },
  ];

  const filtered = activeFilterCount(sp, fields) > 0 || Boolean(filters.q);

  return (
    <>
      <PageHeader
        title={SECTION_LABELS.donation}
        description="قائمة حالات التبرعات مع إمكانية البحث والتصفية"
        icon={<HandHeart />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "التبرعات" }]}
        actions={
          <LinkButton href="/donations/new">
            <Plus className="size-4" aria-hidden />
            إضافة
          </LinkButton>
        }
      />
      <Card className="overflow-visible">
        <FilterPanel fields={fields} searchPlaceholder="ابحث بالاسم، رقم الهاتف، الحالة من طرف، العمل، الملاحظات..." />
        {rows.length === 0 ? (
          filtered ? (
            <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تعديل كلمات البحث أو مسح الفلاتر." />
          ) : (
            <EmptyState
              icon={<HandHeart />}
              title="لا توجد حالات تبرعات مسجلة بعد"
              description="ابدأ بإضافة أول حالة إلى النظام."
              action={
                <LinkButton href="/donations/new">
                  <Plus className="size-4" aria-hidden />
                  إضافة حالة
                </LinkButton>
              }
            />
          )
        ) : (
          <>
            <DonationTable rows={rows} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/donations" searchParams={sp} />
          </>
        )}
      </Card>
    </>
  );
}
