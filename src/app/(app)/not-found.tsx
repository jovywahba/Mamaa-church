import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <EmptyState
        icon={<FileQuestion />}
        title="السجل غير موجود"
        description="ربما تم حذف هذا السجل أو أن الرابط غير صحيح."
        action={<LinkButton href="/">العودة للرئيسية</LinkButton>}
      />
    </div>
  );
}
