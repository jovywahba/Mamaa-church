import type { Profile } from "@/lib/types";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { UserBadge } from "./user-badge";

export function Sidebar({ profile }: { profile: Profile }) {
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-slate-100 px-5">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-3">
        <NavLinks isAdmin={profile.role === "admin"} />
      </div>
      <div className="border-t border-slate-100 p-3">
        <UserBadge profile={profile} />
      </div>
    </aside>
  );
}
