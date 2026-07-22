// Test-drive slot generation. Supabase-free so it can run on both the server
// (validating a booking, generating availability) and the client (rendering the
// picker) — same split as lib/carMatch.ts. All wall-clock math is done in the
// dealership timezone and stored/compared as UTC instants (ISO strings).
import { ChatHours } from './chatHours';

export const SLOT_MINUTES = 60;   // length of each bookable slot
export const MIN_LEAD_HOURS = 2;  // earliest a slot can be booked from now
export const WINDOW_DAYS = 14;    // how far out bookings are allowed

export type Slot = { iso: string; dateKey: string; dateLabel: string; timeLabel: string };
export type MarkedSlot = Slot & { available: boolean };

const SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Convert a wall-clock time in `tz` to the correct UTC instant (DST-aware).
function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(asUtc));
  const g = (t: string) => +(parts.find(p => p.type === t)?.value || '0');
  let hh = g('hour'); if (hh === 24) hh = 0;
  const shown = Date.UTC(g('year'), g('month') - 1, g('day'), hh, g('minute'), g('second'));
  return new Date(asUtc - (shown - asUtc));
}

const toMinutes = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };

export function generateSlots(
  hours: ChatHours,
  tz: string,
  now: Date = new Date(),
  opts?: { windowDays?: number; minLeadHours?: number; slotMinutes?: number },
): Slot[] {
  const windowDays = opts?.windowDays ?? WINDOW_DAYS;
  const minLead = opts?.minLeadHours ?? MIN_LEAD_HOURS;
  const step = opts?.slotMinutes ?? SLOT_MINUTES;
  const tzSafe = tz || 'America/Halifax';
  const minInstant = now.getTime() + minLead * 3600_000;
  const maxInstant = now.getTime() + windowDays * 24 * 3600_000;

  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: tzSafe, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateLabelFmt = new Intl.DateTimeFormat('en-US', { timeZone: tzSafe, weekday: 'short', month: 'short', day: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: tzSafe, hour: 'numeric', minute: '2-digit', hour12: true });

  const seen = new Set<string>();
  const slots: Slot[] = [];

  for (let off = 0; off <= windowDays; off++) {
    const dayInstant = new Date(now.getTime() + off * 24 * 3600_000);
    const p = dayFmt.formatToParts(dayInstant);
    const gv = (t: string) => p.find(x => x.type === t)?.value || '';
    const y = +gv('year'), mo = +gv('month'), d = +gv('day');
    const wd = SHORT_TO_INDEX[gv('weekday')] ?? 0;
    const dateKey = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (seen.has(dateKey)) continue;
    seen.add(dateKey);

    const slot = hours?.[wd];
    if (!slot || !slot.open || !slot.close) continue;
    const openM = toMinutes(slot.open), closeM = toMinutes(slot.close);

    for (let t = openM; t + step <= closeM; t += step) {
      const inst = zonedToUtc(y, mo, d, Math.floor(t / 60), t % 60, tzSafe);
      const ms = inst.getTime();
      if (ms < minInstant || ms > maxInstant) continue;
      slots.push({
        iso: inst.toISOString(),
        dateKey,
        dateLabel: dateLabelFmt.format(inst),
        timeLabel: timeFmt.format(inst),
      });
    }
  }
  return slots;
}

export function markAvailability(slots: Slot[], takenIso: Set<string>): MarkedSlot[] {
  return slots.map(s => ({ ...s, available: !takenIso.has(s.iso) }));
}

// Group a flat slot list into days (for the picker UI).
export function groupByDate<T extends Slot>(slots: T[]): { dateKey: string; dateLabel: string; slots: T[] }[] {
  const map = new Map<string, { dateKey: string; dateLabel: string; slots: T[] }>();
  for (const s of slots) {
    let e = map.get(s.dateKey);
    if (!e) { e = { dateKey: s.dateKey, dateLabel: s.dateLabel, slots: [] }; map.set(s.dateKey, e); }
    e.slots.push(s);
  }
  return [...map.values()];
}

// Is a given ISO instant a currently-valid, bookable slot for these hours/tz?
// (Used server-side to reject forged or stale slot values.)
export function isValidSlot(iso: string, hours: ChatHours, tz: string, now: Date = new Date()): boolean {
  const target = new Date(iso);
  if (isNaN(target.getTime())) return false;
  return generateSlots(hours, tz, now).some(s => s.iso === target.toISOString());
}
