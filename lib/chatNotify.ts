// Server-only: notifies the sales team when a visitor starts a LIVE chat.
// Sends an SMS to each active agent (Twilio) and one email to the dealership
// inbox (Resend), reusing the exact fetch patterns already proven in
// lib/matchAlerts.ts. Best-effort — every path no-ops when its env vars are
// missing and never throws, so the visitor's chat flow is never blocked.
import { escapeHtml } from './escapeHtml';

type Agent = { name?: string; phone?: string; active?: boolean };

export type ChatNotifyOpts = {
  agents: Agent[];
  name: string;      // visitor name or "Website visitor"
  contact: string;   // visitor-supplied email/phone (may be '')
  text: string;      // the message
  url: string;       // link to the admin chat console
  teamEmail: string; // dealership inbox
};

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !fromNum || !to) return false;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      },
      body: new URLSearchParams({ From: fromNum, To: to, Body: body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(to: string, opts: ChatNotifyOpts): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';
  const name = escapeHtml(opts.name);
  const contact = opts.contact ? escapeHtml(opts.contact) : '';
  const text = escapeHtml(opts.text);
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;font-size:14.5px;line-height:1.6;color:#222;">
      <h2 style="color:#111;margin:0 0 6px;">💬 New live chat</h2>
      <p style="color:#445;margin:0 0 14px;"><strong>${name}</strong>${contact ? ` &middot; ${contact}` : ''} just messaged on the website:</p>
      <blockquote style="margin:0 0 18px;padding:12px 16px;background:#f5f7fa;border-left:3px solid #1E8FC4;border-radius:8px;color:#222;">${text}</blockquote>
      <p style="margin:0 0 18px;">
        <a href="${opts.url}" style="display:inline-block;background:#1E8FC4;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;">Reply in the chat console</a>
      </p>
      <p style="color:#889;font-size:12px;margin:0;">The visitor is waiting — reply quickly to keep them engaged. Carson Exports</p>
    </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [to], subject: `💬 New live chat from ${opts.name}`, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyTeamNewChat(opts: ChatNotifyOpts): Promise<{ smsSent: number; emailSent: boolean }> {
  const smsBody =
    `New live chat — ${opts.name}` +
    (opts.contact ? ` (${opts.contact})` : '') +
    `: "${truncate(opts.text, 120)}" — reply: ${opts.url}`;

  const phones = opts.agents.filter(a => a.active !== false && a.phone).map(a => a.phone as string);
  const smsResults = await Promise.all(phones.map(p => sendSms(p, smsBody)));
  const emailSent = await sendEmail(opts.teamEmail, opts);

  return { smsSent: smsResults.filter(Boolean).length, emailSent };
}
