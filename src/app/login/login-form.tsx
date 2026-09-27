"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Info, LogIn } from "lucide-react";
import { login, type LoginState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : notice ? (
        <div className="flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}

      <Field label="اسم المستخدم" htmlFor="username" hint="يمكنك إدخال اسم المستخدم أو البريد الإلكتروني">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          dir="ltr"
          className="text-start"
          defaultValue={state.username}
          required
          autoFocus
        />
      </Field>

      <Field label="كلمة المرور" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            dir="ltr"
            className="pe-10 text-start"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending && <LogIn className="size-5 rtl:-scale-x-100" aria-hidden />}
        {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
