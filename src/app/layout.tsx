import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

// ★ 修正：PWA（ホーム画面への追加）用のメタデータを追加
export const metadata: Metadata = {
  title: "みんカレ",
  description: "直感的なマトリックスUIで、Googleカレンダーと完全同期する最強の日程調整アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "みんカレ",
  },
};

// ★ 修正：スマホでズームされないように＆全画面化するためのビューポート設定
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}