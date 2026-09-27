import type { Profile } from "@/lib/types";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { UserBadge } from "./user-badge";

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNav profile={profile} userBadge={<UserBadge profile={profile} />} />
        <div className="lg:hidden">
          <Logo compact />
        </div>
        <GlobalSearch />
      </div>
    </header>
  );
}
