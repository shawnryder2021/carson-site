// Netlify Scheduled Function — pulls the Google Sheet into Supabase on a schedule.
// Runs daily at 6:00 AM UTC. Requires env vars SYNC_SECRET and SUPABASE_SERVICE_ROLE_KEY.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SYNC_SECRET;
  if (!base || !secret) {
    console.log('scheduled-sync: missing URL or SYNC_SECRET; skipping');
    return new Response('skipped', { status: 200 });
  }
  try {
    // Secret travels in a header, not the URL, so it can't land in access logs.
    const res = await fetch(`${base}/api/sync-inventory`, { method: 'POST', headers: { 'x-sync-secret': secret } });
    const body = await res.text();
    console.log('scheduled-sync result:', res.status, body);
    return new Response(body, { status: res.status });
  } catch (e) {
    console.error('scheduled-sync error', e);
    return new Response('error', { status: 500 });
  }
};

export const config = {
  schedule: '0 6 * * *', // daily 06:00 UTC
};
