/* eslint-disable @typescript-eslint/no-explicit-any */
import { checkRateLimit, getClientIp } from '../lib/rate-limit';

export default async function handler(req: any, res: any) {
  const { allowed, retryAfter } = checkRateLimit(getClientIp(req));
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too Many Requests' });
  }

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

  // GET: 予約一覧取得（RLSバイパス）
  if (req.method === 'GET') {
    const hostEmail = req.query?.host_email;
    if (!hostEmail) return res.status(400).json({ error: 'host_email query param required' });
    const listRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?host_email=eq.${encodeURIComponent(hostEmail)}&order=start_time.desc`,
      { headers: sbHeaders },
    );
    if (!listRes.ok) return res.status(500).json({ error: 'Failed to fetch bookings' });
    const data = await listRes.json();
    return res.status(200).json(data);
  }

  // PATCH: ステータス更新（confirm / decline）
  if (req.method === 'PATCH') {
    const { bookingId, status } = req.body;
    if (!bookingId || !status) return res.status(400).json({ error: 'bookingId and status required' });

    let gcalCreated = false;

    // confirm の場合: Google Calendar にイベントを作成する
    if (status === 'confirmed') {
      try {
        // 予約データ取得
        const bookingRes = await fetch(
          `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&limit=1`,
          { headers: sbHeaders },
        );
        const bookings = await bookingRes.json();
        const booking = bookings[0];

        if (booking) {
          // ホストのリフレッシュトークン取得
          const tokenRes = await fetch(
            `${supabaseUrl}/rest/v1/host_tokens?email=eq.${encodeURIComponent(booking.host_email)}&select=google_refresh_token&limit=1`,
            { headers: sbHeaders },
          );
          const tokenRows = await tokenRes.json();

          if (tokenRows.length && tokenRows[0].google_refresh_token) {
            // アクセストークン再取得
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

            if (refreshRes.ok) {
              const { access_token } = await refreshRes.json();

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

              const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  summary: `[予約] ${booking.guest_name}`,
                  description,
                  start: { dateTime: booking.start_time, timeZone: 'Asia/Tokyo' },
                  end: { dateTime: booking.end_time, timeZone: 'Asia/Tokyo' },
                }),
              });

              if (calRes.ok) {
                gcalCreated = true;
              } else {
                const err = await calRes.json().catch(() => ({}));
                console.error('GCal event creation failed:', err);
              }
            }
          } else {
            console.warn('No refresh token found for host:', booking.host_email);
          }
        }
      } catch (e) {
        console.error('GCal integration error:', e);
      }
    }

    // Supabase のステータスを更新（service role でRLSバイパス）
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status }),
    });

    if (!updateRes.ok) {
      console.error('Supabase update failed:', await updateRes.text());
      return res.status(500).json({ error: 'Failed to update booking status' });
    }

    return res.status(200).json({ ok: true, gcalCreated });
  }

  // DELETE: 予約削除
  if (req.method === 'DELETE') {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId required' });

    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'DELETE',
      headers: sbHeaders,
    });

    if (!deleteRes.ok) {
      console.error('Supabase delete failed:', await deleteRes.text());
      return res.status(500).json({ error: 'Failed to delete booking' });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
