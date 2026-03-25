/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug required' });
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

  // 1. slug からホストのメールを取得
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?slug=eq.${encodeURIComponent(slug)}&select=email&limit=1`,
    { headers: sbHeaders },
  );
  const profiles = await profileRes.json();
  if (!profiles.length) {
    return res.status(200).json({ synced: false, reason: 'profile_not_found' });
  }
  const hostEmail: string = profiles[0].email;

  // 2. リフレッシュトークンを取得（service role で RLS バイパス）
  const tokenRes = await fetch(
    `${supabaseUrl}/rest/v1/host_tokens?email=eq.${encodeURIComponent(hostEmail)}&select=google_refresh_token&limit=1`,
    { headers: sbHeaders },
  );
  const tokenRows = await tokenRes.json();
  if (!tokenRows.length || !tokenRows[0].google_refresh_token) {
    return res.status(200).json({ synced: false, reason: 'no_token' });
  }

  // 3. アクセストークンを再取得
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
    return res.status(200).json({ synced: false, reason: 'token_refresh_failed' });
  }
  const { access_token } = await refreshRes.json();

  // 4. Google Calendar イベントを取得（今日から21日分）
  const now = new Date();
  const future = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(future.toISOString())}&singleEvents=true&maxResults=250`,
    { headers: { Authorization: `Bearer ${access_token}` } },
  );

  if (!calRes.ok) {
    return res.status(200).json({ synced: false, reason: 'calendar_fetch_failed' });
  }
  const { items = [] } = await calRes.json();

  const rows = (items as any[])
    .filter(e => e.status !== 'cancelled')
    .map(e => ({
      event_id: e.id,
      host_email: hostEmail,
      start_time: e.start?.dateTime ?? `${e.start?.date}T00:00:00+09:00`,
      end_time: e.end?.dateTime ?? `${e.end?.date}T23:59:59+09:00`,
      is_all_day: !!e.start?.date,
      updated_at: new Date().toISOString(),
    }));

  // 5. host_busy_slots に upsert
  if (rows.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/host_busy_slots`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    });
  }

  return res.status(200).json({ synced: true, count: rows.length });
}
