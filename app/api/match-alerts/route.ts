import { createClient } from '@supabase/supabase-js';
import { runMatchAlerts, sendTestWebhook } from '@/lib/matchAlerts';
import { SITE_URL } from '@/lib/serverDb';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

// Match CarFinder requests against inventory and send alerts.
// Auth, in order of preference:
//   1. ?secret=SYNC_SECRET + SUPABASE_SERVICE_ROLE_KEY  (scheduled jobs)
//   2. A logged-in admin's Supabase access token         (admin UI buttons)
// With an admin token we run as that user (anon client + their JWT), so no
// service-role key is needed for the admin-triggered path — RLS lets
// authenticated users read/update car_requests.
async function run(req: Request) {
  const url = new URL(req.url);
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let sb = null;

  const secret = url.searchParams.get('secret');
  if (process.env.SYNC_SECRET && secret === process.env.SYNC_SECRET && SERVICE_KEY) {
    sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  } else {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data } = await userClient.auth.getUser(token);
      if (data?.user) {
        // Prefer the service client when available; otherwise act as the admin.
        sb = SERVICE_KEY
          ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
          : userClient;
      }
    }
  }

  if (!sb) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // ?test=1 → fire a sample payload at the webhook to verify the hookup
    if (url.searchParams.get('test')) {
      const { ok, webhookUrl } = await sendTestWebhook(sb, SITE_URL);
      if (!webhookUrl) return Response.json({ error: 'No webhook configured. Save a webhook URL first.' }, { status: 400 });
      return Response.json({ ok, test: true, webhookUrl: webhookUrl.replace(/^(https?:\/\/[^/]+).*/, '$1/…') });
    }
    const summary = await runMatchAlerts(sb, SITE_URL);
    return Response.json({ ok: true, ...summary, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Matching failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
