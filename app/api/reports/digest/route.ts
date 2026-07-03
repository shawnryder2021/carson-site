import { createClient } from '@supabase/supabase-js';
import { buildAndSendDigest } from '@/lib/reportDigest';
import { SITE_URL } from '@/lib/serverDb';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { requireAdmin } from '@/lib/adminAuth';
import { checkSyncSecret } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// Send the weekly report digest email.
// Auth, in order of preference:
//   1. ?secret=SYNC_SECRET + SUPABASE_SERVICE_ROLE_KEY  (scheduled cron job)
//   2. A logged-in ADMIN's Supabase access token          ("send test digest" button)
// This must actually verify admin status, not just "is there a session" —
// customers have accounts too (My Garage), and the ?to= override below could
// otherwise let a signed-in shopper redirect the business digest to themselves.
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
    const overrideTo = url.searchParams.get('to') || undefined;
    const result = await buildAndSendDigest(sb, SITE_URL, overrideTo);
    return Response.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Digest failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
