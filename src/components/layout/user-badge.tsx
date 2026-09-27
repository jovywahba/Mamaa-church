import { UserRound } from "lucide-react";
import type { Profile } from "@/lib/types";

export function UserBadge({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="flex size-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
        <UserRound className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-slate-800">{profile.full_name || profile.username}</p>
        <p className="truncate text-xs text-slate-500">
          <bdi dir="ltr">{profile.username}</bdi> · {profile.role === "admin" ? "مسؤول" : "مستخدم"}
        </p>
      </div>
    </div>
  );
}
