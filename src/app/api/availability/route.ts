import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    // ★変更：hostSlugだけでなく、確実な hostEmail でも受け取れるようにする
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

    // 地下金庫からトークンを取り出す
    const { data: tokenData } = await supabaseAdmin.from('user_tokens').select('refresh_token').eq('email', hostProfile.email).single();

    if (!tokenData || !tokenData.refresh_token) {
      return NextResponse.json({ error: 'Google連携されていません' }, { status: 400 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const googleTokenData = await tokenRes.json();
    const accessToken = googleTokenData.access_token;
    if (!accessToken) throw new Error('トークン取得失敗');

    // Google FreeBusy API を呼び出し
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
    
    // {"start": "...", "end": "..."} の配列が返る
    const busySlots = freeBusyData.calendars.primary.busy;

    return NextResponse.json({ busy: busySlots });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}