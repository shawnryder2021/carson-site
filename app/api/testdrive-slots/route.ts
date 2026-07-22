import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { generateSlots, markAvailability, groupByDate } from '@/lib/testdriveSlots';
import { loadBookingConfig } from '@/lib/bookingConfig';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

// Public: returns bookable test-drive slots (dealership hours + timezone) with
// availability. Reveals only booleans — never any booking's PII.
export async function GET(req: Request) {
  if (!(await rateLimit(req, 'td-slots', 60, 60))) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  try {
    const cfg = await loadBookingConfig(sb);
    const slots = generateSlots(cfg.hours, cfg.timezone);

    // Which slots are already taken (needs service role to read bookings).
    let taken = new Set<string>();
    if (SERVICE_KEY) {
      const { data } = await sb.from('bookings').select('slot_start').eq('status', 'booked');
      taken = new Set((data || []).map((r: any) => new Date(r.slot_start).toISOString()));
    }
    return Response.json({ timezone: cfg.timezone, days: groupByDate(markAvailability(slots, taken)) });
  } catch (e: any) {
    console.error('testdrive-slots error:', e?.message || e);
    return Response.json({ error: 'Could not load times.' }, { status: 500 });
  }
}
