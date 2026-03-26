import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* アプリ名・説明 */}
        <title>みんカレ</title>
        <meta name="description" content="Googleカレンダーと連携するスマートなスケジュール管理アプリ" />
        <meta name="application-name" content="みんカレ" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* テーマカラー */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="msapplication-TileColor" content="#2563EB" />

        {/* iOS PWA 設定 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="みんカレ" />

        {/* iOS アイコン */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />

        {/* favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="shortcut icon" href="/icons/favicon-32.png" />

        {/* OGP (SNSシェア用) */}
        <meta property="og:title" content="みんカレ" />
        <meta property="og:description" content="Googleカレンダーと連携するスマートなスケジュール管理アプリ" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icons/icon-512.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
  overscroll-behavior: none;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
