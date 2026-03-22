import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iPhone向けセーフエリア対応
  experimental: {
    // viewportFit: cover for safe-area-inset
  },
  // PWA: サービスワーカーはVercelが自動対応するため next-pwa は不要
  // headers でPWA用ヘッダーを追加
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
