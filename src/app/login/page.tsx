import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Church } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user?.profile?.is_active) redirect("/");

  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const reason = typeof sp.reason === "string" ? sp.reason : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-md">
            <Church className="size-8" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Mama Church</h1>
          <p className="mt-1 text-sm text-slate-500">نظام إدارة خدمات الأسر والتبرعات — من يديك أعطيناك</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-1 text-lg font-bold text-slate-900">تسجيل الدخول</h2>
          <p className="mb-6 text-sm text-slate-500">أدخل اسم المستخدم وكلمة المرور للمتابعة</p>
          <LoginForm
            next={next}
            notice={
              reason === "inactive"
                ? "هذا الحساب غير مفعل. يرجى التواصل مع مسؤول النظام"
                : reason === "signedout"
                  ? "تم تسجيل الخروج بنجاح"
                  : undefined
            }
          />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">للاستخدام الداخلي فقط</p>
      </div>
    </main>
  );
}
