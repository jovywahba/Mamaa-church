import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireUser();

  return (
    <div className="min-h-dvh">
      <Sidebar profile={profile} />
      <div className="lg:ps-64">
        <Topbar profile={profile} />
        <main className="mx-auto w-full max-w-7xl px-3.5 pt-5 pb-10 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
