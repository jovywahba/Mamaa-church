import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { UsersManager } from "./users-manager";

export const metadata: Metadata = { title: "المستخدمون" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active, created_at")
    .order("created_at");
  if (error) throw error;

  return (
    <>
      <PageHeader
        title="إدارة المستخدمين"
        description="إضافة مستخدمين جدد، تغيير كلمات المرور، وإيقاف الحسابات"
        icon={<Users />}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "المستخدمون" }]}
      />
      <UsersManager users={(data ?? []) as (Profile & { created_at: string })[]} currentUserId={me.id} />
    </>
  );
}
