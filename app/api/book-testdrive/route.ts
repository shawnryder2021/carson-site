import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { SITE_URL } from '@/lib/serverDb';
import { loadBookingConfig } from '@/lib/bookingConfig';
import { isValidSlot } from '@/lib/testdriveSlots';
import { sendCustomerBooking, notifyTeamBooking, BookingInfo } from '@/lib/bookingNotify';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  if (!(await rateLimit(req, 'td-book', 10, 60))) {
    return Response.json({ error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return Response.json({ error: 'Booking is not configured.' }, { status: 503 });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const { vehicleId, slotIso, name, email, phone } = body;

  if (!name || !email || !slotIso) {
    return Response.json({ error: 'Please add your name, email, and pick a time.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(String(email))) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const cfg = await loadBookingConfig(sb);
  if (!isValidSlot(String(slotIso), cfg.hours, cfg.timezone)) {
    return Response.json({ error: 'That time isn’t available anymore. Please pick another slot.' }, { status: 400 });
  }
  const startIso = new Date(slotIso).toISOString();

  // Tie to a signed-in garage user when a token is supplied.
  let userId: string | null = null;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const u = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.getUser(token);
      userId = u.data?.user?.id ?? null;
    } catch { /* anonymous booking is fine */ }
  }

  // Vehicle title + tz-formatted labels.
  let vehicleTitle = 'a vehicle';
  if (vehicleId) {
    const { data: v } = await sb.from('vehicles').select('year, make, model').eq('id', vehicleId).maybeSingle();
    if (v) vehicleTitle = `${v.year} ${v.make} ${v.model}`;
  }
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(startIso));
  const timeLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(startIso));

  // 1) Reserve the slot — the partial-unique index prevents double-booking.
  const { data: booking, error: bErr } = await sb.from('bookings')
    .insert({ slot_start: startIso, vehicle_id: vehicleId || null, user_id: userId, name, email, phone: phone || null, status: 'booked' })
    .select('id').single();
  if (bErr) {
    if ((bErr as any).code === '23505') {
      return Response.json({ error: 'Sorry, that time was just booked. Please choose another.' }, { status: 409 });
    }
    console.error('booking insert error:', bErr.message);
    return Response.json({ error: 'Could not save your booking. Please try again.' }, { status: 500 });
  }

  // 2) Create the CRM lead (drives garage Requests + admin Leads + GA).
  const payload = { vehicle: vehicleTitle, vehicleId: vehicleId || null, datetime: startIso, dateLabel, timeLabel, bookingId: booking.id };
  const { data: lead } = await sb.from('leads')
    .insert({ type: 'testdrive', name, email, phone: phone || null, vehicle_id: vehicleId || null, user_id: userId, payload, status: 'new' })
    .select('id').single();
  if (lead) await sb.from('bookings').update({ lead_id: lead.id }).eq('id', booking.id);

  // 3) Emails — best effort, never fail the booking.
  const info: BookingInfo = { bookingId: booking.id, vehicleTitle, vehicleId, dateLabel, timeLabel, startIso, name, email, phone: phone || '', siteUrl: SITE_URL };
  sendCustomerBooking(info, 'confirm').catch(() => {});
  notifyTeamBooking(info, cfg.teamEmail, cfg.agents, 'new').catch(() => {});

  return Response.json({ ok: true, bookingId: booking.id, dateLabel, timeLabel });
}
