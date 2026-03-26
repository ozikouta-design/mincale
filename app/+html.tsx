import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>みんカレ</title>
        <meta name="description" content="Googleカレンダーと連携するスマートなスケジュール管理アプリ" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* テーマカラー */}
        <meta name="theme-color" content="#2563EB" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="みんカレ" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />

        {/* OGP */}
        <meta property="og:title" content="みんカレ" />
        <meta property="og:description" content="Googleカレンダーと連携するスマートなスケジュール管理アプリ" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://mincale.vercel.app/icons/icon-512.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
body {
  background-color: #fff;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
