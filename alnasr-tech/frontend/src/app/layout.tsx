import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "النصر تك | ERP + الفوترة الإلكترونية",
  description: "نظام إدارة موارد المؤسسات والفوترة الإلكترونية المتوافق مع هيئة الضرائب المصرية",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground font-sans">
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
