// Server-only: transactional emails + team alerts for test-drive bookings.
// Reuses the proven Resend/Twilio fetch patterns (lib/matchAlerts, chatNotify)
// and escapes all user-supplied fields (lib/escapeHtml).
import { escapeHtml } from './escapeHtml';
import { signBooking } from './bookingToken';

const ADDRESS = '550 Windmill Rd, Dartmouth, NS';
const DEALER = 'Carson Exports';

export type BookingInfo = {
  bookingId: string;
  vehicleTitle: string;
  vehicleId?: string | null;
  dateLabel: string;
  timeLabel: string;
  startIso: string;
  name: string;
  email: string;
  phone: string;
  siteUrl: string;
};

function gcalUrl(info: BookingInfo): string {
  const start = new Date(info.startIso);
  const end = new Date(start.getTime() + 45 * 60000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = encodeURIComponent(`Test drive: ${info.vehicleTitle} — ${DEALER}`);
  const details = encodeURIComponent(`Test drive at ${DEALER}. Vehicle: ${info.vehicleTitle}.`);
  const location = encodeURIComponent(ADDRESS);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${stamp(start)}/${stamp(end)}&details=${details}&location=${location}`;
}

async function resend(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, fromNum = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !fromNum || !to) return false;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      body: new URLSearchParams({ From: fromNum, To: to, Body: body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendCustomerBooking(info: BookingInfo, kind: 'confirm' | 'reminder'): Promise<boolean> {
  const first = escapeHtml((info.name || 'there').split(' ')[0]);
  const title = escapeHtml(info.vehicleTitle);
  const cancelUrl = `${info.siteUrl}/api/book-testdrive/cancel?id=${encodeURIComponent(info.bookingId)}&t=${signBooking(info.bookingId)}`;
  const heading = kind === 'confirm' ? `You're booked in, ${first} 🚗` : `Reminder: your test drive is coming up, ${first} 🚗`;
  const intro = kind === 'confirm' ? 'Your test drive is confirmed — here are the details:' : 'A friendly reminder about your upcoming test drive:';
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
      <h2 style="color:#111;margin:0 0 6px;">${heading}</h2>
      <p style="color:#445;font-size:14px;line-height:1.6;margin:0 0 16px;">${intro}</p>
      <table style="width:100%;border:1px solid #eee;border-radius:12px;border-collapse:separate;overflow:hidden;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#667;font-size:13px;width:90px;">Vehicle</td><td style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:700;">${title}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #eee;color:#667;font-size:13px;">When</td><td style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:700;">${escapeHtml(info.dateLabel)} at ${escapeHtml(info.timeLabel)}</td></tr>
        <tr><td style="padding:12px 16px;color:#667;font-size:13px;">Where</td><td style="padding:12px 16px;">${ADDRESS}</td></tr>
      </table>
      <p style="margin:18px 0 6px;">
        <a href="${gcalUrl(info)}" style="display:inline-block;background:#1E8FC4;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:8px;">Add to Google Calendar</a>
      </p>
      <p style="color:#889;font-size:12px;line-height:1.6;margin:16px 0 0;">
        Need to change plans? <a href="${cancelUrl}" style="color:#889;">Cancel this test drive</a>.<br/>
        ${DEALER} · ${ADDRESS} · See you soon!
      </p>
    </div>`;
  const subject = kind === 'confirm'
    ? `✅ Test drive confirmed — ${info.vehicleTitle}, ${info.dateLabel} ${info.timeLabel}`
    : `⏰ Reminder: test drive ${info.dateLabel} — ${info.vehicleTitle}`;
  return resend(info.email, subject, html);
}

export async function notifyTeamBooking(
  info: BookingInfo,
  teamEmail: string,
  agents: { name?: string; phone?: string; active?: boolean }[],
  kind: 'new' | 'cancelled',
): Promise<void> {
  const verb = kind === 'new' ? 'New test drive booked' : 'Test drive CANCELLED';
  const smsBody = `${verb}: ${info.vehicleTitle} — ${info.dateLabel} ${info.timeLabel} — ${info.name}${info.phone ? ' ' + info.phone : ''}`;
  const phones = (agents || []).filter(a => a.active !== false && a.phone).map(a => a.phone as string);
  await Promise.all(phones.map(p => sms(p, smsBody)));

  if (teamEmail) {
    const html = `
      <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <h2 style="color:${kind === 'new' ? '#111' : '#A8232C'};margin:0 0 10px;">${verb}</h2>
        <table style="width:100%;border:1px solid #eee;border-radius:12px;border-collapse:separate;overflow:hidden;">
          <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#667;font-size:13px;width:90px;">Vehicle</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:700;">${escapeHtml(info.vehicleTitle)}</td></tr>
          <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#667;font-size:13px;">When</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-weight:700;">${escapeHtml(info.dateLabel)} at ${escapeHtml(info.timeLabel)}</td></tr>
          <tr><td style="padding:10px 14px;border-bottom:1px solid #eee;color:#667;font-size:13px;">Customer</td><td style="padding:10px 14px;">${escapeHtml(info.name)}</td></tr>
          <tr><td style="padding:10px 14px;color:#667;font-size:13px;">Contact</td><td style="padding:10px 14px;">${escapeHtml(info.phone)}${info.phone && info.email ? ' · ' : ''}${escapeHtml(info.email)}</td></tr>
        </table>
        <p style="margin:16px 0 0;"><a href="${info.siteUrl}/admin/leads" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 16px;border-radius:8px;">Open leads</a></p>
      </div>`;
    await resend(teamEmail, `${verb}: ${info.vehicleTitle} — ${info.dateLabel} ${info.timeLabel}`, html);
  }
}
