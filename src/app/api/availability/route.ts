import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  try {
    const { hostSlug, timeMin, timeMax } = await req.json();

    // 1. URLのIDからホストを探す
    const { data: hostProfile } = await supabase.from('profiles').select('*').eq('slug', hostSlug).single();
    if (!hostProfile || !hostProfile.google_refresh_token) {
      return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 400 });
    }

    // 2. アクセストークンの再取得
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: hostProfile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error('トークン取得失敗');

    // 3. Googleカレンダーの「FreeBusy（空き時間）」APIを叩いて、予定が入っている時間を取得
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
    
    // primaryカレンダーの「予定が入っている時間帯」の配列を返す
    const busySlots = freeBusyData.calendars.primary.busy;

    return NextResponse.json({ busy: busySlots });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}