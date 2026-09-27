import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, HandHeart, Search, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { globalSearch } from "@/lib/data/search";
import { familyTitle, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spString } from "@/components/records/filter-types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "البحث" };

export default async function SearchPage(props: PageProps<"/search">) {
  await requireUser();
  const sp = await props.searchParams;
  const q = spString(sp, "q") ?? "";
  const kind = spString(sp, "kind");
  const all = q ? await globalSearch(q, 100) : [];
  const results = kind === "family" || kind === "donation" ? all.filter((r) => r.kind === kind) : all;
  const counts = { family: all.filter((r) => r.kind === "family").length, donation: all.filter((r) => r.kind === "donation").length };

  const tab = (value: string | undefined, label: string, count: number) => {
    const params = new URLSearchParams({ q });
    if (value) params.set("kind", value);
    const active = (kind ?? undefined) === value;
    return (
      <Link
        href={`/search?${params}`}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
          active ? "bg-primary-700 text-white" : "text-slate-600 hover:bg-slate-100",
        )}
      >
        {label} <span className="tabular-nums opacity-75">({count})</span>
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="البحث الشامل"
        description="ابحث في جميع السجلات: الأسماء، الأولاد، أرقام الهاتف، العنوان، العمل، نوع المساعدة، الملاحظات، الحالة من طرف..."
        icon={<Search />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "البحث" }]}
      />

      <Card className="mb-6 p-4">
        <form action="/search" className="flex flex-col gap-2 sm:flex-row" role="search">
          <label htmlFor="search-page-q" className="sr-only">
            كلمات البحث
          </label>
          <Input id="search-page-q" name="q" type="search" defaultValue={q} placeholder="ابحث بالاسم، رقم الهاتف، العنوان..." autoFocus={!q} className="h-11 text-base" />
          <Button type="submit" size="lg" className="h-11">
            <Search className="size-4" aria-hidden />
            بحث
          </Button>
        </form>
      </Card>

      {!q ? (
        <Card>
          <EmptyState icon={<Search />} title="اكتب كلمة للبحث" description="يمكنك البحث بأكثر من كلمة، مثل اسم الأب واسم أحد الأولاد معاً." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 p-3">
            {tab(undefined, "الكل", all.length)}
            {tab("family", "خدمات الأسر", counts.family)}
            {tab("donation", "التبرعات", counts.donation)}
          </div>
          {results.length === 0 ? (
            <EmptyState title="لا توجد نتائج مطابقة" description={`لم يتم العثور على نتائج لـ "${q}". جرّب كلمات أخرى أو جزءاً من الاسم.`} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((r) => {
                const href = r.kind === "family" ? `/families/${r.id}` : `/donations/${r.id}`;
                return (
                  <li key={`${r.kind}-${r.id}`}>
                    <Link href={href} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:px-5">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          r.kind === "family" ? "bg-primary-50 text-primary-700" : "bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {r.kind === "family" ? <UsersRound className="size-5" /> : <HandHeart className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{familyTitle(r.father_name, r.mother_name)}</span>
                          <Badge tone={r.kind === "family" ? "primary" : "green"}>
                            {r.kind === "family" ? "خدمات الأسر" : "التبرعات"}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-500">
                          {[r.father_name && r.mother_name ? `الأم: ${r.mother_name}` : null, r.details].filter(Boolean).join(" • ") || "—"}
                        </span>
                      </span>
                      <span className="hidden text-xs whitespace-nowrap text-slate-400 sm:block">{formatDate(r.created_at)}</span>
                      <ChevronLeft className="size-4 shrink-0 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
