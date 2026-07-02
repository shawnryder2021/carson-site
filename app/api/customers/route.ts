import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Lists My Garage customer accounts (auth.users, excluding admins) joined
// with their profile and a count of what they've done on the site. Needs the
// service-role key because listing auth.users requires elevated access —
// the anon key + RLS can't do it even for admins.
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return Response.json({ error: 'Customer list needs SUPABASE_SERVICE_ROLE_KEY configured in Netlify.' }, { status: 503 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const [{ data: userPage, error: usersErr }, { data: admins }, { data: profiles }, { data: saved }, { data: watches }, { data: leads }, { data: requests }] = await Promise.all([
      sb.auth.admin.listUsers({ perPage: 1000 }),
      sb.from('admin_users').select('user_id'),
      sb.from('profiles').select('id, name, phone, contact_pref'),
      sb.from('saved_vehicles').select('user_id'),
      sb.from('vehicle_watches').select('user_id').eq('active', true).not('user_id', 'is', null),
      sb.from('leads').select('user_id').not('user_id', 'is', null),
      sb.from('car_requests').select('user_id').not('user_id', 'is', null),
    ]);
    if (usersErr) throw usersErr;

    const adminIds = new Set((admins || []).map((a: any) => a.user_id));
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    const countBy = (rows: any[] | null) => {
      const m = new Map<string, number>();
      (rows || []).forEach(r => m.set(r.user_id, (m.get(r.user_id) || 0) + 1));
      return m;
    };
    const savedCounts = countBy(saved);
    const watchCounts = countBy(watches);
    const leadCounts = countBy(leads);
    const requestCounts = countBy(requests);

    const customers = (userPage?.users || [])
      .filter(u => !adminIds.has(u.id))
      .map(u => {
        const p = profileById.get(u.id);
        return {
          id: u.id,
          email: u.email || '',
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
          name: p?.name || '',
          phone: p?.phone || '',
          contactPref: p?.contact_pref || 'email',
          savedCount: savedCounts.get(u.id) || 0,
          watchCount: watchCounts.get(u.id) || 0,
          leadCount: leadCounts.get(u.id) || 0,
          requestCount: requestCounts.get(u.id) || 0,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json({ customers });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Failed to load customers' }, { status: 500 });
  }
}
