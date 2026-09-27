import { HandHeart, Home, Search, Users, UsersRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/families", label: "خدمات الأسر", icon: UsersRound },
  { href: "/donations", label: "التبرعات", icon: HandHeart },
  { href: "/search", label: "البحث", icon: Search },
  { href: "/users", label: "المستخدمون", icon: Users, adminOnly: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
