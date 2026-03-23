import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// ★変更：管理者用キーを使用
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = supabaseUrl ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
  try {
    const body = await req.json();
    const { hostId, hostEmail, guestName, guestEmail, guestPhone, meetingType, zoomUrl, location, otherDetails, startDt, endDt, guestNotes } = body;

    let hostProfile = null;
    if (hostEmail) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', hostEmail).single();
      hostProfile = data;
    }
    
    if (!hostProfile) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hostId);
      if (isUUID) {
         const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', hostId).single();
         hostProfile = data;
      }
    }

    if (!hostProfile) {
       return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 404 });
    }

    // ★変更：地下金庫からトークンを取り出す
    const { data: tokenData } = await supabaseAdmin.from('user_tokens').select('refresh_token').eq('email', hostProfile.email).single();

    if (!tokenData || !tokenData.refresh_token) {
      await supabaseAdmin.from('bookings').insert({
        profile_id: hostProfile.id, host_email: hostProfile.email, guest_name: guestName, guest_email: guestEmail,
        guest_phone: guestPhone || null, guest_memo: guestNotes || null, meeting_type: meetingType,
        zoom_url: zoomUrl || null, location: location || null, other_details: otherDetails || null,
        start_time: startDt, end_time: endDt
      });
      return NextResponse.json({ success: true, message: "Supabaseにのみ保存しました（Google未連携）" });
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

    if (!accessToken) throw new Error('Googleトークンの再取得に失敗しました');

    let locationText = "";
    if (meetingType === "zoom") locationText = zoomUrl;
    else if (meetingType === "inperson") locationText = location;
    else if (meetingType === "other") locationText = otherDetails;
    else if (meetingType === "meet") locationText = "Google Meet";

    const event = {
      summary: `【予約】${guestName}様 お打ち合わせ`,
      description: `ゲスト: ${guestName}\nメール: ${guestEmail || '未入力'}\n電話: ${guestPhone || '未入力'}\n形式: ${meetingType}\n\n■ メモ・共有事項\n${guestNotes || 'なし'}`,
      location: locationText,
      start: { dateTime: startDt },
      end: { dateTime: endDt },
      attendees: [
        { email: guestEmail } 
      ],
      ...(meetingType === "meet" && {
        conferenceData: {
          createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } 
        }
      })
    };

    const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", { 
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!calendarRes.ok) throw new Error('Googleカレンダーへの登録に失敗しました');

    await supabaseAdmin.from('bookings').insert({
      profile_id: hostProfile.id,
      host_email: hostProfile.email,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone || null,
      guest_memo: guestNotes || null,
      meeting_type: meetingType,
      zoom_url: zoomUrl || null,
      location: location || null,
      other_details: otherDetails || null,
      start_time: startDt,
      end_time: endDt
    });

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}