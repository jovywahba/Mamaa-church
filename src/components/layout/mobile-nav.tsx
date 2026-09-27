"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Profile } from "@/lib/types";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function MobileNav({ profile, userBadge }: { profile: Profile; userBadge: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer after navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="فتح القائمة"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {/* Portal: the sticky header uses backdrop-filter, which would trap position:fixed children. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق القائمة"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto p-3">
              <NavLinks isAdmin={profile.role === "admin"} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-slate-100 p-3">{userBadge}</div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
