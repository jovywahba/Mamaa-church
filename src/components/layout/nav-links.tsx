"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { NAV_ITEMS, isActive } from "./nav-items";

export function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="القائمة الرئيسية" className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin).map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-primary-50 text-primary-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("size-5", active ? "text-primary-700" : "text-slate-400")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <form action={logout} className="mt-auto pt-4">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="size-5 text-slate-400" aria-hidden />
          تسجيل الخروج
        </button>
      </form>
    </nav>
  );
}
