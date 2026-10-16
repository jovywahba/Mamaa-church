import Link from "next/link";
import { ArrowLeft, HandHeart, Plus, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardCounts } from "@/lib/data/search";
import { SECTION_LABELS } from "@/lib/constants";
import { LinkButton } from "@/components/ui/button";
import { formatPlainDate, todayIso } from "@/lib/format";

const SECTIONS = [
  {
    key: "family",
    href: "/families",
    newHref: "/families/new",
    title: SECTION_LABELS.family,
    description: "تسجيل ومتابعة بيانات الأسر المستفيدة: الأب والأم والأولاد، العنوان وأرقام التواصل، ونوع المساعدة المقدمة.",
    icon: UsersRound,
    accent: "bg-primary-50 text-primary-700 ring-primary-100",
    bar: "bg-primary-600",
    hoverBorder: "hover:border-primary-200",
  },
  {
    key: "donation",
    href: "/donations",
    newHref: "/donations/new",
    title: SECTION_LABELS.donation,
    description: "تسجيل ومتابعة التبرعات: بيانات الحالة، الحالة من طرف، والجهة الموجهة إليها المساعدة.",
    icon: HandHeart,
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "bg-emerald-500",
    hoverBorder: "hover:border-emerald-200",
  },
] as const;

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const counts = await getDashboardCounts();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">أهلاً {profile.full_name || profile.username}</h1>
          <p className="mt-1.5 text-sm text-slate-500">اختر القسم الذي تريد العمل عليه</p>
        </div>
        <p className="text-sm font-medium text-slate-400">{formatPlainDate(todayIso())}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = s.key === "family" ? counts.families : counts.donations;
          return (
            <div
              key={s.key}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-primary-200 sm:p-8 ${s.hoverBorder}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${s.bar}`} aria-hidden />
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`flex size-14 items-center justify-center rounded-2xl ring-1 transition-transform duration-200 group-hover:scale-105 ${s.accent}`}
                >
                  <Icon className="size-7" aria-hidden />
                </span>
                {count !== null && (
                  <div className="rounded-xl bg-slate-50 px-4 py-2 text-center ring-1 ring-slate-100">
                    <p className="text-2xl leading-none font-extrabold text-slate-900 tabular-nums">{count}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">حالة مسجلة</p>
                  </div>
                )}
              </div>
              <h2 className="mt-6 text-xl leading-relaxed font-bold text-slate-900">
                <Link href={s.href} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
                  {s.title}
                </Link>
              </h2>
              <p className="mt-2 max-w-prose flex-1 text-sm leading-7 text-slate-500">{s.description}</p>
              <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                <LinkButton href={s.href}>
                  فتح القسم
                  <ArrowLeft className="size-4" aria-hidden />
                </LinkButton>
                <LinkButton href={s.newHref} variant="outline">
                  <Plus className="size-4" aria-hidden />
                  إضافة حالة
                </LinkButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
