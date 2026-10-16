import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, icon, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3 border-b border-slate-200/80 pb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft className="size-3.5 text-slate-400" aria-hidden />}
              {crumb.href ? (
                <Link href={crumb.href} className="inline-flex items-center gap-1 rounded hover:text-primary-700 hover:underline">
                  {i === 0 && crumb.href === "/" && <Home className="size-3.5" aria-hidden />}
                  {crumb.label}
                </Link>
              ) : (
                <span className="max-w-[16rem] truncate font-medium text-slate-700" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <div className="mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100 sm:flex [&>svg]:size-6">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl leading-snug font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
