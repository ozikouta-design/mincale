/**
 * Vercel サーバーレス関数向けインメモリ・レート制限ユーティリティ
 *
 * Vercel の関数インスタンス間は共有されないため、
 * 本格的な制限には Upstash Redis 等の外部ストアを利用してください。
 * 少量トラフィックの簡易保護として使用します。
 */

const rateLimit = new Map<string, { count: number; ts: number }>();

const WINDOW_MS = 60_000; // 1分
const MAX_REQUESTS = 30;  // 1分あたり最大30リクエスト

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (entry && now - entry.ts < WINDOW_MS) {
    if (entry.count >= MAX_REQUESTS) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.ts + WINDOW_MS - now) / 1000),
      };
    }
    entry.count++;
  } else {
    rateLimit.set(ip, { count: 1, ts: now });
  }

  return { allowed: true };
}

/** API ハンドラ内で IP を取得するヘルパー */
export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
