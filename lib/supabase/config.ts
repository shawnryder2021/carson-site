// Central place to read Supabase env + check whether it's configured.
//
// These are PUBLIC values (the publishable/anon key is designed to be exposed
// in the browser; security is enforced by row-level security in the database).
// Env vars take precedence so they can be overridden per-environment.
const FALLBACK_URL = 'https://sfxswebjrzzdqtuzfmvd.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_Ss30iEcie-uEQfO58Q76Cg_TIxHy-GZ';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
