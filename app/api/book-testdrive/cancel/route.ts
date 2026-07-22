import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { SITE_URL } from '@/lib/serverDb';
import { verifyBooking } from '@/lib/bookingToken';
import { loadBookingConfig } from '@/lib/bookingConfig';
import { notifyTeamBooking } from '@/lib/bookingNotify';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, ok: boolean): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
  <body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;">
    <div style="max-width:460px;margin:12vh auto;background:#fff;border:1px solid #e8e8e8;border-radius:16px;padding:36px 30px;text-align:center;">
      <div style="font-size:40px;margin-bottom:10px;">${ok ? '✅' : '⚠️'}</div>
      <h1 style="font-size:20px;margin:0 0 8px;color:#111;">${title}</h1>
      <p style="font-size:14.5px;color:#666;line-height:1.6;margin:0 0 22px;">${body}</p>
      <a href="/inventory" style="display:inline-block;background:#1E8FC4;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px;">Browse inventory</a>
    </div>
  </body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// One-click cancel from the confirmation/reminder email (no login). A signed
// token proves the booking id; we free the slot and mark the lead closed.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || '';
  const t = url.searchParams.get('t') || '';
  if (!verifyBooking(id, t)) {
    return page('Link expired', 'This cancellation link is invalid or has expired. Please call us to change your booking.', false);
  }
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return page('Something went wrong', 'We couldn’t update your booking right now. Please call us.', false);
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const { data: b } = await sb.from('bookings').select('*').eq('id', id).maybeSingle();
    if (!b) return page('Not found', 'That booking no longer exists.', false);
    if (b.status === 'cancelled') return page('Already cancelled', 'This test drive was already cancelled.', true);

    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (b.lead_id) await sb.from('leads').update({ status: 'closed' }).eq('id', b.lead_id);

    // Notify the team (best effort).
    try {
      const cfg = await loadBookingConfig(sb);
      const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(b.slot_start));
      const timeLabel = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(b.slot_start));
      let vehicleTitle = 'a vehicle';
      if (b.vehicle_id) {
        const { data: v } = await sb.from('vehicles').select('year, make, model').eq('id', b.vehicle_id).maybeSingle();
        if (v) vehicleTitle = `${v.year} ${v.make} ${v.model}`;
      }
      await notifyTeamBooking(
        { bookingId: id, vehicleTitle, vehicleId: b.vehicle_id, dateLabel, timeLabel, startIso: new Date(b.slot_start).toISOString(), name: b.name || '', email: b.email || '', phone: b.phone || '', siteUrl: SITE_URL },
        cfg.teamEmail, cfg.agents, 'cancelled',
      );
    } catch { /* best effort */ }

    return page("You're all set", 'Your test drive has been cancelled. Book another time whenever you’re ready — no hard feelings!', true);
  } catch {
    return page('Something went wrong', 'We couldn’t update your booking right now. Please call us.', false);
  }
}
