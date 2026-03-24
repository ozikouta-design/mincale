/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier, redirect_uri } = req.body as {
    code: string;
    code_verifier: string;
    redirect_uri: string;
  };

  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const params = new URLSearchParams({
    client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    code,
    code_verifier,
    grant_type: 'authorization_code',
    redirect_uri,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json(data);
  }

  return res.status(200).json(data);
}
