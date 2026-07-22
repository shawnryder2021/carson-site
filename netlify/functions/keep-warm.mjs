// Netlify Scheduled Function — keeps the Supabase project awake.
// Supabase free-tier projects auto-pause after ~7 days with no API activity;
// a pause makes the site fall back to demo inventory and blocks admin login.
// This makes one harmless public read a day so the project never idles out.
// No secrets needed — uses the public URL + anon (publishable) key, with the
// same hardcoded fallbacks as lib/supabase/config.ts, so it works even before
// any env vars are set on the function.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ss30iEcie-uEQfO58Q76Cg_TIxHy-GZ';

export default async () => {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/vehicles?select=id&limit=1`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    console.log('keep-warm:', res.status);
    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error('keep-warm error', e);
    return new Response('error', { status: 500 });
  }
};

export const config = {
  schedule: '0 7 * * *', // daily 07:00 UTC
};
