import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "点单与专属库存",
  description: "基于 Next.js 与 Supabase 的点单与专属虚拟库存系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
