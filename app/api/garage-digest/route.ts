import { createClient } from '@supabase/supabase-js';
import { buildAndSendGarageDigest } from '@/lib/garageDigest';
import { SITE_URL } from '@/lib/serverDb';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { requireAdmin } from '@/lib/adminAuth';
import { checkSyncSecret } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Send the weekly "new arrivals for you" garage digest.
// Auth: SYNC_SECRET (x-sync-secret header) + service role for the cron job, OR
// a logged-in admin (for a manual "run now" test). Always uses the service-role
// client for the actual work, since it must read every user's saves + emails.
async function run(req: Request) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return Response.json({ error: 'Not configured (SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });

  const authorized = (checkSyncSecret(req)) || (await requireAdmin(req));
  if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  try {
    const result = await buildAndSendGarageDigest(sb, SITE_URL);
    return Response.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('Garage digest error:', e?.message || e);
    return Response.json({ error: 'Digest failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
