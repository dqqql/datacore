import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const headingFont = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "DND 数据管理中心",
  description: "用于西征模式世界的角色、经济、背包与交易管理中心",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(182,145,87,0.18),_transparent_30%),linear-gradient(180deg,_#f7f0df_0%,_#efe3cb_100%)] text-[var(--color-ink-900)]">
          {children}
        </div>
      </body>
    </html>
  );
}
