// Netlify Scheduled Function — sends the weekly report digest email.
// Runs Mondays at 12:00 UTC. Requires env vars SYNC_SECRET and SUPABASE_SERVICE_ROLE_KEY.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SYNC_SECRET;
  if (!base || !secret) {
    console.log('scheduled-report: missing URL or SYNC_SECRET; skipping');
    return new Response('skipped', { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/reports/digest`, { method: 'POST', headers: { 'x-sync-secret': secret } });
    const body = await res.text();
    console.log('scheduled-report result:', res.status, body);
    return new Response(body, { status: res.status });
  } catch (e) {
    console.error('scheduled-report error', e);
    return new Response('error', { status: 500 });
  }
};

export const config = {
  schedule: '0 12 * * 1', // Monday 12:00 UTC
};
