import { createClient } from '@supabase/supabase-js';
import { runMatchAlerts, sendTestWebhook } from '@/lib/matchAlerts';
import { SITE_URL } from '@/lib/serverDb';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { checkSyncSecret } from '@/lib/secretAuth';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Match CarFinder requests against inventory and send alerts.
// Auth, in order of preference:
//   1. SYNC_SECRET (x-sync-secret header / ?secret=) + service role  (cron)
//   2. A logged-in ADMIN's Supabase access token                     (admin UI)
async function run(req: Request) {
  const url = new URL(req.url);
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let sb = null;

  if (checkSyncSecret(req) && SERVICE_KEY) {
    sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  } else if (await requireAdmin(req)) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    sb = SERVICE_KEY
      ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
      : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
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
