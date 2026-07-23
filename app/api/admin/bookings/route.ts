import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { SITE_URL } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminAuth';
import { loadBookingConfig } from '@/lib/bookingConfig';
import { notifyTeamBooking, sendCustomerBooking, BookingInfo } from '@/lib/bookingNotify';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function service() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createClient(SUPABASE_URL, key, { auth: { persistSession: false } }) : null;
}

// GET: enriched list of all test-drive bookings for the admin screen.
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = service();
  if (!sb) return Response.json({ error: 'Not configured (SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });

  try {
    const [{ data: bookings }, { data: vehicles }, cfg] = await Promise.all([
      sb.from('bookings').select('id, slot_start, vehicle_id, name, email, phone, status, created_at').order('slot_start', { ascending: true }),
      sb.from('vehicles').select('id, year, make, model'),
      loadBookingConfig(sb),
    ]);
    const vById = new Map((vehicles || []).map((v: any) => [v.id, `${v.year} ${v.make} ${v.model}`]));
    const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'short', month: 'short', day: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: true });
    const now = Date.now();

    const rows = (bookings || []).map((b: any) => {
      const start = new Date(b.slot_start);
      return {
        id: b.id,
        slotStart: start.toISOString(),
        dateLabel: dateFmt.format(start),
        timeLabel: timeFmt.format(start),
        vehicleTitle: b.vehicle_id ? (vById.get(b.vehicle_id) || 'a vehicle') : 'a vehicle',
        vehicleId: b.vehicle_id,
        name: b.name || '',
        email: b.email || '',
        phone: b.phone || '',
        status: b.status,
        isPast: start.getTime() < now,
      };
    });
    return Response.json({ timezone: cfg.timezone, bookings: rows });
  } catch (e: any) {
    console.error('admin bookings GET error:', e?.message || e);
    return Response.json({ error: 'Could not load bookings.' }, { status: 500 });
  }
}

// POST: change a booking's status (complete | no_show | cancel).
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = service();
  if (!sb) return Response.json({ error: 'Not configured.' }, { status: 503 });

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const { id, action } = body;
  if (!id || !['complete', 'no_show', 'cancel'].includes(action)) {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  const statusMap: Record<string, string> = { complete: 'completed', no_show: 'no_show', cancel: 'cancelled' };
  const newStatus = statusMap[action];

  try {
    const { data: b } = await sb.from('bookings').select('*').eq('id', id).maybeSingle();
    if (!b) return Response.json({ error: 'Booking not found.' }, { status: 404 });

    await sb.from('bookings').update({ status: newStatus }).eq('id', id);

    if (action === 'cancel') {
      if (b.lead_id) await sb.from('leads').update({ status: 'closed' }).eq('id', b.lead_id);
      // Notify team + customer (best effort).
      try {
        const cfg = await loadBookingConfig(sb);
        let vehicleTitle = 'a vehicle';
        if (b.vehicle_id) {
          const { data: v } = await sb.from('vehicles').select('year, make, model').eq('id', b.vehicle_id).maybeSingle();
          if (v) vehicleTitle = `${v.year} ${v.make} ${v.model}`;
        }
        const start = new Date(b.slot_start);
        const info: BookingInfo = {
          bookingId: id, vehicleTitle, vehicleId: b.vehicle_id,
          dateLabel: new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(start),
          timeLabel: new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(start),
          startIso: start.toISOString(), name: b.name || '', email: b.email || '', phone: b.phone || '', siteUrl: SITE_URL,
        };
        await notifyTeamBooking(info, cfg.teamEmail, cfg.agents, 'cancelled');
        if (b.email) await sendCustomerBooking(info, 'cancelled');
      } catch { /* best effort */ }
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('admin bookings POST error:', e?.message || e);
    return Response.json({ error: 'Could not update booking.' }, { status: 500 });
  }
}
