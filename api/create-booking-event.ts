/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { bookingId } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  const sbHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // 1. 予約データ取得
  const bookingRes = await fetch(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&limit=1`,
    { headers: sbHeaders },
  );
  const bookings = await bookingRes.json();
  if (!bookings.length) return res.status(404).json({ error: 'Booking not found' });
  const booking = bookings[0];

  // 2. ホストのリフレッシュトークン取得
  const tokenRes = await fetch(
    `${supabaseUrl}/rest/v1/host_tokens?email=eq.${encodeURIComponent(booking.host_email)}&select=google_refresh_token&limit=1`,
    { headers: sbHeaders },
  );
  const tokenRows = await tokenRes.json();
  if (!tokenRows.length || !tokenRows[0].google_refresh_token) {
    return res.status(200).json({ created: false, reason: 'no_token' });
  }

  // 3. アクセストークン再取得
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: tokenRows[0].google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) {
    return res.status(200).json({ created: false, reason: 'token_refresh_failed' });
  }
  const { access_token } = await refreshRes.json();

  // 4. Google Calendar イベント作成
  const meetingLabels: Record<string, string> = {
    zoom: 'Zoom', meet: 'Google Meet', inperson: '対面', other: 'その他',
  };
  const meetingLabel = meetingLabels[booking.meeting_type || 'other'] || 'その他';
  const description = [
    `ゲスト: ${booking.guest_name}`,
    booking.guest_email ? `メール: ${booking.guest_email}` : null,
    booking.guest_memo ? `メモ: ${booking.guest_memo}` : null,
    `ミーティング種別: ${meetingLabel}`,
  ].filter(Boolean).join('\n');

  const eventBody = {
    summary: `[予約] ${booking.guest_name}`,
    description,
    start: { dateTime: booking.start_time, timeZone: 'Asia/Tokyo' },
    end: { dateTime: booking.end_time, timeZone: 'Asia/Tokyo' },
  };

  const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody),
  });

  if (!calRes.ok) {
    const err = await calRes.json().catch(() => ({}));
    console.error('GCal event creation failed:', err);
    // GCal 失敗でも booking は confirmed にする
  }

  const calEvent = calRes.ok ? await calRes.json() : null;

  // 5. 予約ステータスを confirmed に更新
  await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'confirmed' }),
  });

  return res.status(200).json({ created: !!calEvent, eventId: calEvent?.id });
}
