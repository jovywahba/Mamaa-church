import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-extrabold text-slate-300">404</p>
      <h1 className="text-lg font-bold text-slate-800">الصفحة غير موجودة</h1>
      <Link href="/" className="text-sm font-semibold text-primary-700 hover:underline">
        العودة للرئيسية
      </Link>
    </main>
  );
}
