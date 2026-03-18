import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ★変更：ビルド時にエラーにならないよう、環境変数が未定義の場合は空文字をデフォルトに設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: Request) {
  try {
    // 実行時に環境変数が不足している場合はエラーをスローしてガード
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ エラー: Supabaseの環境変数が設定されていません");
      return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
    }

    // 管理者用キーを使用してクライアントを初期化
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { hostEmail, hostSlug, timeMin, timeMax } = await req.json();

    let hostProfile;
    if (hostEmail) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', hostEmail).single();
      hostProfile = data;
    } else if (hostSlug) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('slug', hostSlug).single();
      hostProfile = data;
    }

    if (!hostProfile) {
      return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 400 });
    }

    // 地下金庫（user_tokensテーブル）からトークンを取り出す
    const { data: tokenData } = await supabaseAdmin.from('user_tokens').select('refresh_token').eq('email', hostProfile.email).single();

    if (!tokenData || !tokenData.refresh_token) {
      return NextResponse.json({ error: 'Google連携されていません' }, { status: 400 });
    }

    // Google APIアクセス用のトークンを更新
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const googleTokenData = await tokenRes.json();
    const accessToken = googleTokenData.access_token;
    if (!accessToken) throw new Error('トークン取得失敗');

    // Google FreeBusy API を呼び出して空き状況を確認
    const freeBusyRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: timeMin,
        timeMax: timeMax,
        timeZone: "Asia/Tokyo",
        items: [{ id: "primary" }]
      }),
    });

    if (!freeBusyRes.ok) throw new Error('カレンダー情報の取得失敗');
    const freeBusyData = await freeBusyRes.json();
    
    // 忙しい時間枠 {"start": "...", "end": "..."} の配列を返す
    const busySlots = freeBusyData.calendars.primary.busy;

    return NextResponse.json({ busy: busySlots });
  } catch (e: any) {
    console.error("availability API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}