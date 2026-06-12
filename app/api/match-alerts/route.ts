import { createClient } from '@supabase/supabase-js';
import { runMatchAlerts } from '@/lib/matchAlerts';
import { SITE_URL } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

// Match CarFinder requests against inventory and send alerts.
// Auth: either ?secret=SYNC_SECRET (scheduled jobs) or a logged-in
// admin's Supabase access token in the Authorization header.
async function run(req: Request) {
  const url = new URL(req.url);
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';

  if (!SERVICE_KEY) {
    return Response.json({ error: 'Not configured (set SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Auth check
  const secret = url.searchParams.get('secret');
  let authorized = !!process.env.SYNC_SECRET && secret === process.env.SYNC_SECRET;
  if (!authorized) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await sb.auth.getUser(token);
      authorized = !!data?.user;
    }
  }
  if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const summary = await runMatchAlerts(sb, SITE_URL);
    return Response.json({ ok: true, ...summary, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Matching failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
