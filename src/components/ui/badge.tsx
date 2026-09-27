import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "green" | "amber" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  primary: "bg-primary-50 text-primary-700 ring-primary-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Shows the first N badges and a "+N" counter for the rest. */
export function BadgeList({ items, max = 2, tone = "primary" }: { items: string[]; max?: number; tone?: Tone }) {
  if (!items.length) return <span className="text-slate-400">—</span>;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1" title={items.join("، ")}>
      {shown.map((item) => (
        <Badge key={item} tone={tone} className="max-w-56 truncate">
          {item}
        </Badge>
      ))}
      {rest > 0 && <Badge tone="neutral">+{rest}</Badge>}
    </div>
  );
}
