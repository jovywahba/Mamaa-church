import Link from "next/link";
import { ArrowLeft, HandHeart, Plus, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardCounts } from "@/lib/data/search";
import { SECTION_LABELS } from "@/lib/constants";
import { LinkButton } from "@/components/ui/button";

const SECTIONS = [
  {
    key: "family",
    href: "/families",
    newHref: "/families/new",
    title: SECTION_LABELS.family,
    description: "تسجيل ومتابعة بيانات الأسر المستفيدة: الأب والأم والأولاد، العنوان وأرقام التواصل، ونوع المساعدة المقدمة.",
    icon: UsersRound,
    accent: "bg-primary-50 text-primary-700 ring-primary-100",
  },
  {
    key: "donation",
    href: "/donations",
    newHref: "/donations/new",
    title: SECTION_LABELS.donation,
    description: "تسجيل ومتابعة التبرعات: بيانات الحالة، الحالة من طرف، والجهة الموجهة إليها المساعدة.",
    icon: HandHeart,
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
] as const;

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const counts = await getDashboardCounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أهلاً {profile.full_name || profile.username}</h1>
        <p className="mt-1 text-sm text-slate-500">اختر القسم الذي تريد العمل عليه</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = s.key === "family" ? counts.families : counts.donations;
          return (
            <div
              key={s.key}
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`flex size-14 items-center justify-center rounded-2xl ring-1 ${s.accent}`}>
                  <Icon className="size-7" aria-hidden />
                </span>
                {count !== null && (
                  <div className="text-end">
                    <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{count}</p>
                    <p className="text-xs text-slate-500">حالة مسجلة</p>
                  </div>
                )}
              </div>
              <h2 className="mt-6 text-xl font-bold leading-relaxed text-slate-900">
                <Link href={s.href} className="after:absolute after:inset-0 after:rounded-2xl">
                  {s.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{s.description}</p>
              <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2">
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
