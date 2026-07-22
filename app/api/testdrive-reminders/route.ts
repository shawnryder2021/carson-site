import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { SITE_URL } from '@/lib/serverDb';
import { checkSyncSecret } from '@/lib/secretAuth';
import { requireAdmin } from '@/lib/adminAuth';
import { loadBookingConfig } from '@/lib/bookingConfig';
import { sendCustomerBooking, BookingInfo } from '@/lib/bookingNotify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Emails a reminder for test drives ~1 day out. Cron path: SYNC_SECRET header +
// service role (like the report digest). Admin token also allowed (manual run).
async function run(req: Request) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return Response.json({ error: 'Not configured.' }, { status: 503 });
  if (!(checkSyncSecret(req) || (await requireAdmin(req)))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const now = Date.now();
    const fromIso = new Date(now + 18 * 3600_000).toISOString();
    const toIso = new Date(now + 30 * 3600_000).toISOString();

    const { data: rows } = await sb.from('bookings')
      .select('id, slot_start, vehicle_id, name, email, phone')
      .eq('status', 'booked')
      .is('reminded_at', null)
      .gte('slot_start', fromIso)
      .lte('slot_start', toIso);

    const cfg = await loadBookingConfig(sb);
    let sent = 0;
    for (const b of rows || []) {
      try {
        if (!b.email) { await sb.from('bookings').update({ reminded_at: new Date().toISOString() }).eq('id', b.id); continue; }
        let vehicleTitle = 'a vehicle';
        if (b.vehicle_id) {
          const { data: v } = await sb.from('vehicles').select('year, make, model').eq('id', b.vehicle_id).maybeSingle();
          if (v) vehicleTitle = `${v.year} ${v.make} ${v.model}`;
        }
        const startIso = new Date(b.slot_start).toISOString();
        const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(startIso));
        const timeLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(startIso));
        const info: BookingInfo = { bookingId: b.id, vehicleTitle, vehicleId: b.vehicle_id, dateLabel, timeLabel, startIso, name: b.name || '', email: b.email, phone: b.phone || '', siteUrl: SITE_URL };
        const ok = await sendCustomerBooking(info, 'reminder');
        if (ok) sent++;
        await sb.from('bookings').update({ reminded_at: new Date().toISOString() }).eq('id', b.id);
      } catch { /* skip one, keep going */ }
    }
    return Response.json({ ok: true, considered: (rows || []).length, sent, at: new Date().toISOString() });
  } catch (e: any) {
    console.error('testdrive-reminders error:', e?.message || e);
    return Response.json({ error: 'Reminder run failed.' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
