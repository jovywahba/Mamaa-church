import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Gift, HandHeart, HandHelping, Info, NotebookPen, Pencil, Phone, User, UserRound, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDonationCase } from "@/lib/data/donation";
import { deleteDonationCase } from "@/lib/actions/donation";
import { familyTitle, formatAgeOrBirthYear, formatDate, formatMoney, formatPlainDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneNumber } from "@/components/ui/phone";
import { DeleteButton } from "@/components/records/delete-button";
import { InfoGrid, InfoItem, MultilineText, SystemInfo } from "@/components/detail/detail-parts";

export async function generateMetadata(props: PageProps<"/donations/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const record = await getDonationCase(id).catch(() => null);
  return { title: record ? familyTitle(record.father_name, record.mother_name) : "تفاصيل الحالة" };
}

export default async function DonationDetailPage(props: PageProps<"/donations/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const record = await getDonationCase(id);
  if (!record) notFound();

  const title = familyTitle(record.father_name, record.mother_name);
  const fatherAge = formatAgeOrBirthYear(record.father_age, record.father_birth_year);
  const motherAge = formatAgeOrBirthYear(record.mother_age, record.mother_birth_year);

  return (
    <>
      <PageHeader
        title={title}
        description={`أضيفت في ${formatDate(record.created_at)}`}
        icon={<HandHeart />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "التبرعات", href: "/donations" }, { label: title }]}
        actions={
          <>
            <LinkButton href="/donations" variant="ghost">
              <ArrowRight className="size-4" aria-hidden />
              رجوع
            </LinkButton>
            <LinkButton href={`/donations/${id}/edit`}>
              <Pencil className="size-4" aria-hidden />
              تعديل
            </LinkButton>
            <DeleteButton recordLabel={title} action={deleteDonationCase.bind(null, id)} redirectTo="/donations" />
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="بيانات الأب" icon={<User />}>
            <InfoGrid>
              <InfoItem label="الاسم">{record.father_name}</InfoItem>
              <InfoItem label="السن أو سنة الميلاد">{fatherAge}</InfoItem>
              <InfoItem label="العمل">{record.father_job}</InfoItem>
            </InfoGrid>
          </SectionCard>
          <SectionCard title="بيانات الأم" icon={<UserRound />}>
            <InfoGrid>
              <InfoItem label="الاسم">{record.mother_name}</InfoItem>
              <InfoItem label="السن أو سنة الميلاد">{motherAge}</InfoItem>
              <InfoItem label="العمل">{record.mother_job}</InfoItem>
            </InfoGrid>
          </SectionCard>
        </div>

        <SectionCard
          title="الأولاد"
          icon={<UsersRound />}
          description={record.children.length ? `${record.children.length} من الأبناء` : undefined}
          bodyClassName={record.children.length ? "p-0" : undefined}
        >
          {record.children.length === 0 ? (
            <p className="text-sm text-slate-400">لا يوجد أبناء مسجلون</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs text-slate-500">
                    <th className="w-12 px-5 py-2.5 text-start font-bold">#</th>
                    <th className="px-5 py-2.5 text-start font-bold">الاسم</th>
                    <th className="px-5 py-2.5 text-start font-bold">العمر أو سنة الميلاد</th>
                    <th className="px-5 py-2.5 text-start font-bold">العمل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.children.map((ch, i) => (
                    <tr key={ch.id}>
                      <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{ch.name}</td>
                      <td className="px-5 py-3 text-slate-700">{formatAgeOrBirthYear(ch.age, ch.birth_year)}</td>
                      <td className="px-5 py-3 text-slate-700">{ch.job ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="أرقام التواصل" icon={<Phone />}>
            <InfoGrid cols={2}>
              <InfoItem label="رقم موبايل الأب">
                {record.father_phone && <PhoneNumber value={record.father_phone} withIcon link />}
              </InfoItem>
              <InfoItem label="رقم موبايل الأم">
                {record.mother_phone && <PhoneNumber value={record.mother_phone} withIcon link />}
              </InfoItem>
            </InfoGrid>
          </SectionCard>
          <SectionCard title="معلومات إضافية" icon={<Info />}>
            <InfoGrid cols={2}>
              <InfoItem label="الحالة من طرف">{record.referred_by}</InfoItem>
            </InfoGrid>
          </SectionCard>
        </div>

        <SectionCard title="تفاصيل التبرع" icon={<Gift />}>
          <InfoGrid cols={2}>
            <InfoItem label="تاريخ التبرع">{record.donation_date ? formatPlainDate(record.donation_date) : null}</InfoItem>
            <InfoItem label="المبلغ النقدي">{record.cash_amount !== null ? formatMoney(record.cash_amount) : null}</InfoItem>
          </InfoGrid>
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-slate-500">نوع التبرع</p>
            {record.donation_types.length ? (
              <div className="flex flex-wrap gap-2">
                {record.donation_types.map((t) => (
                  <Badge key={t.id} tone="amber" className="px-3 py-1 text-sm">
                    {t.name_ar}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
          {record.other_donation_type && (
            <div className="mt-4">
              <InfoItem label="تفاصيل التبرعات الأخرى">{record.other_donation_type}</InfoItem>
            </div>
          )}
        </SectionCard>

        <SectionCard title="المساعدة موجهة إلى" icon={<HandHelping />}>
          <div className="flex flex-wrap gap-2">
            {record.categories.map((c) => (
              <Badge key={c.id} tone="green" className="px-3 py-1 text-sm">
                {c.name_ar}
              </Badge>
            ))}
          </div>
          {record.other_category && (
            <div className="mt-4">
              <InfoItem label="أخرى">{record.other_category}</InfoItem>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="الملاحظات" icon={<NotebookPen />}>
            <MultilineText value={record.notes} />
          </SectionCard>
          <SectionCard title="ملاحظات إضافية" icon={<NotebookPen />}>
            <MultilineText value={record.additional_notes} />
          </SectionCard>
        </div>

        <SystemInfo
          id={record.id}
          createdAt={record.created_at}
          updatedAt={record.updated_at}
          creator={record.creator}
          updater={record.updater}
        />
      </div>
    </>
  );
}
