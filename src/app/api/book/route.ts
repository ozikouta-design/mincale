import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hostSlug, guestName, guestEmail, guestPhone, meetingType, zoomUrl, location, otherDetails, startDt, endDt, guestNotes } = body;

    // 1. URLのID(slug)からホストのトークンを取得
    const { data: hostProfile } = await supabase.from('profiles').select('*').eq('slug', hostSlug).single();
    if (!hostProfile || !hostProfile.google_refresh_token) {
      return NextResponse.json({ error: 'ホストが見つからないか、Google連携されていません' }, { status: 400 });
    }

    // 2. リフレッシュトークンを使って最新のアクセス権を取得
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

    if (!accessToken) throw new Error('Googleトークンの再取得に失敗しました');

    // 3. 実施形式のテキスト化
    let locationText = "";
    if (meetingType === "zoom") locationText = zoomUrl;
    else if (meetingType === "inperson") locationText = location;
    else if (meetingType === "other") locationText = otherDetails;

    // 4. Googleカレンダーに予定を登録
    const event = {
      summary: `【予約】${guestName}様 お打ち合わせ`,
      description: `ゲスト: ${guestName}\nメール: ${guestEmail || '未入力'}\n電話: ${guestPhone || '未入力'}\n形式: ${meetingType}\nメモ: ${guestNotes || 'なし'}`,
      location: locationText,
      start: { dateTime: startDt },
      end: { dateTime: endDt },
      ...(meetingType === "meet" && {
        conferenceData: {
          createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } }
        }
      })
    };

    const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!calendarRes.ok) throw new Error('Googleカレンダーへの登録に失敗しました');

    // 5. Supabaseに予約データを保存
    await supabase.from('bookings').insert({
      host_email: hostProfile.email, guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone,
      meeting_type: meetingType, location_or_url: locationText, notes: guestNotes, start_time: startDt, end_time: endDt
    });

    return NextResponse.json({ success: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}