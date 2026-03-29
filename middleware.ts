/**
 * Vercel Edge Middleware — レート制限
 *
 * このプロジェクトは Expo Web を Vercel にデプロイしており、
 * Next.js ではないため Next.js 専用の EdgeRuntime は使用しない。
 * レート制限は lib/rate-limit.ts を API ハンドラから直接呼び出す形で実装している。
 *
 * Next.js プロジェクトへ移行した場合は以下のコードを有効化する:
 *
 * ```ts
 * import { NextResponse } from 'next/server';
 * import type { NextRequest } from 'next/server';
 *
 * const rateLimit = new Map<string, { count: number; ts: number }>();
 * const WINDOW_MS = 60_000;
 * const MAX_REQUESTS = 30;
 *
 * export function middleware(req: NextRequest) {
 *   if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
 *   const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
 *   const now = Date.now();
 *   const entry = rateLimit.get(ip);
 *   if (entry && now - entry.ts < WINDOW_MS) {
 *     if (entry.count >= MAX_REQUESTS) {
 *       return new NextResponse('Too Many Requests', {
 *         status: 429,
 *         headers: { 'Retry-After': String(Math.ceil((entry.ts + WINDOW_MS - now) / 1000)) },
 *       });
 *     }
 *     entry.count++;
 *   } else {
 *     rateLimit.set(ip, { count: 1, ts: now });
 *   }
 *   return NextResponse.next();
 * }
 *
 * export const config = { matcher: '/api/:path*' };
 * ```
 *
 * 現在は lib/rate-limit.ts の checkRateLimit() を各 API ハンドラで呼び出している。
 */
