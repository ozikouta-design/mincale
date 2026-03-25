/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, refresh_token } = req.body;
  if (!email || !refresh_token) return res.status(400).json({ error: 'email and refresh_token required' });

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  const sbHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: 'resolution=merge-duplicates',
  };

  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/host_tokens`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({
      email,
      google_refresh_token: refresh_token,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    console.error('host_tokens upsert failed:', err);
    return res.status(500).json({ error: 'Failed to save token' });
  }

  return res.status(200).json({ ok: true });
}
