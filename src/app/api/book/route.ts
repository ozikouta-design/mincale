import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hostId, hostEmail, guestName, guestEmail, guestPhone, meetingType, zoomUrl, location, otherDetails, startDt, endDt, guestNotes } = body;

    // ★ 修正：メールアドレスが送られてきている場合は、最も確実な「email」でホストを検索する
    let hostProfile = null;
    
    if (hostEmail) {
      const { data } = await supabase.from('profiles').select('*').eq('email', hostEmail).single();
      hostProfile = data;
    }
    
    // メールアドレスで見つからなかった場合のフォールバック（IDで検索）
    if (!hostProfile) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hostId);
      if (isUUID) {
         const { data } = await supabase.from('profiles').select('*').eq('id', hostId).single();
         hostProfile = data;
      }
    }

    // それでも見つからなければエラーを返す
    if (!hostProfile) {
       return NextResponse.json({ error: 'ホストが見つかりません' }, { status: 404 });
    }

    // Google連携されていない場合はSupabaseへの保存だけ行う
    if (!hostProfile.google_refresh_token) {
      await supabase.from('bookings').insert({
        profile_id: hostProfile.id, host_email: hostProfile.email, guest_name: guestName, guest_email: guestEmail,
        guest_phone: guestPhone || null, guest_memo: guestNotes || null, meeting_type: meetingType,
        zoom_url: zoomUrl || null, location: location || null, other_details: otherDetails || null,
        start_time: startDt, end_time: endDt
      });
      return NextResponse.json({ success: true, message: "Supabaseにのみ保存しました（Google未連携）" });
    }

    // リフレッシュトークンを使って最新のアクセス権を取得
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

    if (!accessToken) {
      console.error("Token refresh failed:", tokenData);
      throw new Error('Googleトークンの再取得に失敗しました');
    }

    // 実施形式のテキスト化
    let locationText = "";
    if (meetingType === "zoom") locationText = zoomUrl;
    else if (meetingType === "inperson") locationText = location;
    else if (meetingType === "other") locationText = otherDetails;
    else if (meetingType === "meet") locationText = "Google Meet";

    // Googleカレンダーに予定を登録 (attendees を追加して招待メールを送る)
    const event = {
      summary: `【予約】${guestName}様 お打ち合わせ`,
      description: `ゲスト: ${guestName}\nメール: ${guestEmail || '未入力'}\n電話: ${guestPhone || '未入力'}\n形式: ${meetingType}\n\n■ メモ・共有事項\n${guestNotes || 'なし'}`,
      location: locationText,
      start: { dateTime: startDt },
      end: { dateTime: endDt },
      attendees: [
        { email: guestEmail } // ゲストへ招待メールを送信
      ],
      ...(meetingType === "meet" && {
        conferenceData: {
          createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } // MeetのURLを自動生成
        }
      })
    };

    // sendUpdates=all でゲストにメール送信
    const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", { 
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!calendarRes.ok) {
       const errData = await calendarRes.json();
       console.error("Google Calendar Error:", errData);
       throw new Error('Googleカレンダーへの登録に失敗しました');
    }

    // Supabaseにも予約データを保存
    await supabase.from('bookings').insert({
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