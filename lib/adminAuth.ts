// Server-only: verifies a bearer token belongs to a signed-in ADMIN, not just
// any authenticated user. Since My Garage customers now have Supabase
// accounts too, "there's a valid session" is no longer sufficient — every
// API route that returns admin-only data must check admin_users membership,
// mirroring the same check in middleware.ts.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase/config';

export async function requireAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user) return false;

  // Fail closed: any error (including a transient PostgREST schema-cache
  // reload, which happens on every deploy) must NOT grant admin. A customer
  // JWT hitting that window would otherwise pass.
  const { data, error } = await sb.from('admin_users').select('user_id').eq('user_id', userData.user.id).maybeSingle();
  if (error) return false;
  return !!data;
}
