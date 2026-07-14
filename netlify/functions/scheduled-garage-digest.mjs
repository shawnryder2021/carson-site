// Netlify Scheduled Function — sends the weekly "new arrivals for you" garage
// digest. Runs Thursdays at 13:00 UTC (~9am Atlantic — weekend-shopping intent;
// change the cron below to retime). Requires SYNC_SECRET + SUPABASE_SERVICE_ROLE_KEY.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SYNC_SECRET;
  if (!base || !secret) {
    console.log('scheduled-garage-digest: missing URL or SYNC_SECRET; skipping');
    return new Response('skipped', { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/garage-digest`, { method: 'POST', headers: { 'x-sync-secret': secret } });
    const body = await res.text();
    console.log('scheduled-garage-digest result:', res.status, body);
    return new Response(body, { status: res.status });
  } catch (e) {
    console.error('scheduled-garage-digest error', e);
    return new Response('error', { status: 500 });
  }
};

export const config = {
  schedule: '0 13 * * 4', // Thursday 13:00 UTC
};
