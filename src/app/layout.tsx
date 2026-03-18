import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast"; // ★ 追加

const inter = Inter({ subsets: ["latin"] });

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
        <AuthProvider>
          {children}
          {/* ★ 追加：アプリ全体でトーストを呼び出せるようにする */}
          <Toaster position="bottom-center" reverseOrder={false} />
        </AuthProvider>
      </body>
    </html>
  );
}