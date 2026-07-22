// Netlify Scheduled Function — sends "your test drive is tomorrow" reminders.
// Runs daily at 15:00 UTC. Requires SYNC_SECRET + SUPABASE_SERVICE_ROLE_KEY.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SYNC_SECRET;
  if (!base || !secret) {
    console.log('scheduled-testdrive-reminder: missing URL or SYNC_SECRET; skipping');
    return new Response('skipped', { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/testdrive-reminders`, { method: 'POST', headers: { 'x-sync-secret': secret } });
    const body = await res.text();
    console.log('scheduled-testdrive-reminder result:', res.status, body);
    return new Response(body, { status: res.status });
  } catch (e) {
    console.error('scheduled-testdrive-reminder error', e);
    return new Response('error', { status: 500 });
  }
};

export const config = {
  schedule: '0 15 * * *', // daily 15:00 UTC
};
