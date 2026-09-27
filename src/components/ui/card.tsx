import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...props} />;
}

type SectionCardProps = {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

/** Titled card used for form sections and detail-page groups. */
export function SectionCard({ title, icon, description, actions, className, bodyClassName, children }: SectionCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-primary-600 [&>svg]:size-5">{icon}</span>}
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}
