import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, HandHelping, MapPin, NotebookPen, Pencil, Phone, User, UserRound, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFamilyCase } from "@/lib/data/family";
import { deleteFamilyCase } from "@/lib/actions/family";
import { familyTitle, formatAgeOrBirthYear, formatDate, formatDateTime, formatMoney, formatPlainDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneNumber } from "@/components/ui/phone";
import { DeleteButton } from "@/components/records/delete-button";
import { InfoGrid, InfoItem, MultilineText, SystemInfo } from "@/components/detail/detail-parts";

export async function generateMetadata(props: PageProps<"/families/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const record = await getFamilyCase(id).catch(() => null);
  return { title: record ? familyTitle(record.father_name, record.mother_name) : "تفاصيل الأسرة" };
}

export default async function FamilyDetailPage(props: PageProps<"/families/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const record = await getFamilyCase(id);
  if (!record) notFound();

  const title = familyTitle(record.father_name, record.mother_name);

  return (
    <>
      <PageHeader
        title={title}
        description={`أضيفت في ${formatDate(record.created_at)}`}
        icon={<UsersRound />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "خدمات الأسر", href: "/families" }, { label: title }]}
        actions={
          <>
            <LinkButton href="/families" variant="ghost">
              <ArrowRight className="size-4" aria-hidden />
              رجوع
            </LinkButton>
            <LinkButton href={`/families/${id}/edit`} variant="primary">
              <Pencil className="size-4" aria-hidden />
              تعديل
            </LinkButton>
            <DeleteButton recordLabel={title} action={deleteFamilyCase.bind(null, id)} redirectTo="/families" />
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="بيانات الأب" icon={<User />}>
            <InfoGrid>
              <InfoItem label="الاسم">{record.father_name}</InfoItem>
              <InfoItem label="السن أو سنة الميلاد">{formatAgeOrBirthYear(record.father_age, record.father_birth_year)}</InfoItem>
              <InfoItem label="العمل">{record.father_job}</InfoItem>
            </InfoGrid>
          </SectionCard>
          <SectionCard title="بيانات الأم" icon={<UserRound />}>
            <InfoGrid>
              <InfoItem label="الاسم">{record.mother_name}</InfoItem>
              <InfoItem label="السن أو سنة الميلاد">{formatAgeOrBirthYear(record.mother_age, record.mother_birth_year)}</InfoItem>
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
                    <th className="px-5 py-2.5 text-start font-bold">المرحلة التعليمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.children.map((ch, i) => (
                    <tr key={ch.id}>
                      <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{ch.name}</td>
                      <td className="px-5 py-3 text-slate-700">{formatAgeOrBirthYear(ch.age, ch.birth_year)}</td>
                      <td className="px-5 py-3 text-slate-700">{ch.education_stage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="أرقام التواصل" icon={<Phone />}>
            {record.phones.length === 0 ? (
              <p className="text-sm text-slate-400">لا توجد أرقام مسجلة</p>
            ) : (
              <ul className="space-y-2">
                {record.phones.map((p) => (
                  <li key={p.id} className="text-sm text-slate-900">
                    <PhoneNumber value={p.phone} withIcon link />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="العنوان" icon={<MapPin />}>
            <MultilineText value={record.address} />
          </SectionCard>
        </div>

        <SectionCard title="المساعدة" icon={<HandHelping />}>
          <div className="flex flex-wrap gap-2">
            {record.types.map((t) => (
              <Badge key={t.id} tone="primary" className="px-3 py-1 text-sm">
                {t.name_ar}
              </Badge>
            ))}
          </div>
          {(record.other_assistance || record.source_service_type) && (
            <div className="mt-4">
              <InfoGrid cols={2}>
                {record.other_assistance && <InfoItem label="تفاصيل المساعدة الأخرى">{record.other_assistance}</InfoItem>}
                {record.source_service_type && (
                  <InfoItem label="نوع الخدمة كما في السجل الأصلي">{record.source_service_type}</InfoItem>
                )}
              </InfoGrid>
            </div>
          )}
        </SectionCard>

        <SectionCard title="تاريخ الخدمة والمصاريف" icon={<CalendarDays />}>
          <InfoGrid cols={2}>
            <InfoItem label="تاريخ الخدمة">{record.service_date ? formatPlainDate(record.service_date) : null}</InfoItem>
            <InfoItem label="المصاريف">{record.expense_amount !== null ? formatMoney(record.expense_amount) : null}</InfoItem>
          </InfoGrid>
        </SectionCard>

        <SectionCard title="الملاحظات" icon={<NotebookPen />}>
          <MultilineText value={record.notes} />
        </SectionCard>

        <SystemInfo
          id={record.id}
          createdAt={record.created_at}
          updatedAt={record.updated_at}
          creator={record.creator}
          updater={record.updater}
          importedFrom={
            record.source_recorded_at
              ? `مستورد من سجلات النموذج القديم (تاريخ التسجيل الأصلي: ${formatDateTime(record.source_recorded_at)})`
              : undefined
          }
        />
      </div>
    </>
  );
}
