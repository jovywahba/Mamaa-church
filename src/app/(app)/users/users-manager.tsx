"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createAppUser, resetUserPassword, setUserActive, setUserRole } from "@/lib/actions/users";
import { formatDate } from "@/lib/format";
import type { ActionResult, Profile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionCard } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

type Row = Profile & { created_at: string };

export function UsersManager({ users, currentUserId }: { users: Row[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ username: "", full_name: "", password: "", role: "staff" as "staff" | "admin" });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function run(fn: () => Promise<ActionResult>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard title="إضافة مستخدم جديد" icon={<UserPlus />}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createAppUser(form), "تم إنشاء المستخدم بنجاح", () =>
              setForm({ username: "", full_name: "", password: "", role: "staff" }),
            );
          }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field label="اسم المستخدم" htmlFor="u-username" hint="حروف إنجليزية وأرقام فقط" required>
            <Input id="u-username" dir="ltr" className="text-start" autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="الاسم الكامل" htmlFor="u-name" required>
            <Input id="u-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="كلمة المرور" htmlFor="u-pass" hint="8 أحرف على الأقل" required>
            <Input id="u-pass" type="password" dir="ltr" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="الصلاحية" htmlFor="u-role">
            <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "staff" | "admin" })}>
              <option value="staff">مستخدم</option>
              <option value="admin">مسؤول</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" loading={pending} className="w-full">
              إضافة
            </Button>
          </div>
        </form>
      </SectionCard>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs text-slate-500">
                <th className="px-4 py-3 text-start font-bold">الاسم</th>
                <th className="px-4 py-3 text-start font-bold">اسم المستخدم</th>
                <th className="px-4 py-3 text-start font-bold">الصلاحية</th>
                <th className="px-4 py-3 text-start font-bold">الحالة</th>
                <th className="px-4 py-3 text-start font-bold">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-start font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const self = u.id === currentUserId;
                return (
                  <tr key={u.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {u.full_name || "—"} {self && <span className="text-xs font-normal text-slate-400">(أنت)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <bdi dir="ltr">{u.username}</bdi>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "admin" ? "amber" : "neutral"}>{u.role === "admin" ? "مسؤول" : "مستخدم"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.is_active ? "green" : "red"}>{u.is_active ? "مفعل" : "موقوف"}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setNewPassword(""); }}>
                          <KeyRound className="size-3.5" aria-hidden />
                          كلمة المرور
                        </Button>
                        {!self && (
                          <>
                            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setUserRole(u.id, u.role === "admin" ? "staff" : "admin"), "تم تحديث الصلاحية")}>
                              <ShieldCheck className="size-3.5" aria-hidden />
                              {u.role === "admin" ? "جعله مستخدماً" : "جعله مسؤولاً"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              className={u.is_active ? "text-red-600" : "text-emerald-700"}
                              onClick={() => run(() => setUserActive(u.id, !u.is_active), u.is_active ? "تم إيقاف الحساب" : "تم تفعيل الحساب")}
                            >
                              {u.is_active ? "إيقاف" : "تفعيل"}
                            </Button>
                          </>
                        )}
                      </div>
                      {resetFor === u.id && (
                        <form
                          className="mt-2 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(() => resetUserPassword(u.id, newPassword), "تم تغيير كلمة المرور", () => setResetFor(null));
                          }}
                        >
                          <Input type="password" dir="ltr" autoComplete="new-password" placeholder="كلمة المرور الجديدة" aria-label="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 max-w-48" />
                          <Button size="sm" type="submit" loading={pending}>
                            حفظ
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
