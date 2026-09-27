import { Phone as PhoneIcon } from "lucide-react";

/** Phone numbers are LTR content inside RTL text — isolate them. */
export function PhoneNumber({ value, withIcon, link }: { value: string; withIcon?: boolean; link?: boolean }) {
  const content = (
    <bdi dir="ltr" className="font-medium tabular-nums">
      {value}
    </bdi>
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      {withIcon && <PhoneIcon className="size-3.5 text-slate-400" aria-hidden />}
      {link ? (
        <a href={`tel:${value}`} className="hover:text-primary-700 hover:underline">
          {content}
        </a>
      ) : (
        content
      )}
    </span>
  );
}
