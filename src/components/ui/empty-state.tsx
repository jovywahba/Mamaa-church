import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-16">
      <div className="relative mb-5">
        <span className="absolute inset-0 -m-2 rounded-full bg-slate-100/70" aria-hidden />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 [&>svg]:size-7">
          {icon ?? <Inbox />}
        </div>
      </div>
      <h3 className="text-base font-bold text-slate-800 sm:text-lg">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
