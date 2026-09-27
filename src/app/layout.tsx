import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mama Church — نظام إدارة الخدمات والتبرعات",
    template: "%s | Mama Church",
  },
  description: "نظام داخلي لإدارة خدمات من يديك أعطيناك إلى الأسر والتبرعات",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f3c63",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster
          dir="rtl"
          position="top-center"
          offset={{ top: 76 }}
          mobileOffset={{ top: 72 }}
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "var(--font-cairo)" } }}
        />
      </body>
    </html>
  );
}
