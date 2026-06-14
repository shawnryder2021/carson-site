// Business-hours logic for the live/AI chat. Shared by the server chat route
// and the admin settings UI. Day index: 0=Sun … 6=Sat (matches JS getDay()).

export type DayHours = { open: string; close: string } | null;
export type ChatHours = DayHours[]; // length 7

export const DEFAULT_CHAT_HOURS: ChatHours = [
  { open: '11:00', close: '17:00' }, // Sun
  { open: '09:00', close: '19:00' }, // Mon
  { open: '09:00', close: '19:00' }, // Tue
  { open: '09:00', close: '19:00' }, // Wed
  { open: '09:00', close: '19:00' }, // Thu
  { open: '09:00', close: '19:00' }, // Fri
  { open: '10:00', close: '18:00' }, // Sat
];

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Is the dealership "open" (live chat) right now in the given timezone?
export function isChatOpen(hours: ChatHours, timezone: string, now: Date = new Date()): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Halifax',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const wd = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    let hh = parts.find(p => p.type === 'hour')?.value || '00';
    const mm = parts.find(p => p.type === 'minute')?.value || '00';
    if (hh === '24') hh = '00';
    const dayIdx = SHORT_TO_INDEX[wd] ?? new Date().getDay();
    const slot = (hours && hours[dayIdx]) || null;
    if (!slot || !slot.open || !slot.close) return false;
    const cur = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    return cur >= slot.open && cur < slot.close;
  } catch {
    return false;
  }
}
