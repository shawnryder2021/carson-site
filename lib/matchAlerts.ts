// Server-only: match active CarFinder requests against current inventory
// and send email (Resend) / SMS (Twilio) alerts. Called from API routes
// with a service-role Supabase client.
import type { SupabaseClient } from '@supabase/supabase-js';
import { CarRequest, newMatchesFor, describeRequest } from './carMatch';

type Veh = { id: string; year: number; make: string; model: string; price: number; mileage: number; body: string; fuel: string; drive: string; status?: string; images?: string[] };

function rowToRequest(r: any): CarRequest {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone,
    contactPref: r.contact_pref, body: r.body, make: r.make, model: r.model,
    yearMin: r.year_min, priceMax: r.price_max, mileageMax: r.mileage_max,
    fuel: r.fuel, drive: r.drive, notes: r.notes, active: r.active,
    notifiedVehicleIds: Array.isArray(r.notified_vehicle_ids) ? r.notified_vehicle_ids : [],
    createdAt: r.created_at,
  };
}

// Primary channel: POST the alert to a webhook (Zapier / Make / GoHighLevel /
// any automation tool) which delivers the email or text. Set ALERT_WEBHOOK_URL.
async function sendWebhook(req: CarRequest, matches: Veh[], siteUrl: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'carfinder.match',
        at: new Date().toISOString(),
        contact: {
          name: req.name,
          email: req.email,
          phone: req.phone,
          preferredChannel: req.contactPref, // 'email' | 'sms'
        },
        request: {
          id: req.id,
          summary: describeRequest(req),
          body: req.body, make: req.make, model: req.model,
          yearMin: req.yearMin, priceMax: req.priceMax, mileageMax: req.mileageMax,
          fuel: req.fuel, drive: req.drive, notes: req.notes,
        },
        matches: matches.map(v => ({
          id: v.id,
          title: `${v.year} ${v.make} ${v.model}`,
          price: v.price,
          mileageKm: v.mileage,
          fuel: v.fuel,
          drive: v.drive,
          url: `${siteUrl}/vehicle/${v.id}`,
          image: v.images?.[0] || null,
        })),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(to: string, name: string, matches: Veh[], siteUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';

  const rows = matches.map(v => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;">
        <div style="font-weight:700;font-size:15px;color:#111;">${v.year} ${v.make} ${v.model}</div>
        <div style="font-size:13px;color:#667;margin-top:2px;">$${v.price.toLocaleString()} &middot; ${v.mileage.toLocaleString()} km &middot; ${v.fuel} &middot; ${v.drive}</div>
        <a href="${siteUrl}/vehicle/${v.id}" style="display:inline-block;margin-top:8px;background:#007C92;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;">View this vehicle</a>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#111;">Good news, ${name.split(' ')[0]} — we found ${matches.length === 1 ? 'a match' : matches.length + ' matches'}!</h2>
      <p style="color:#445;font-size:14px;line-height:1.6;">${matches.length === 1 ? 'A vehicle' : 'Vehicles'} matching your CarFinder request just ${matches.length === 1 ? 'arrived' : 'arrived'} at Carson Exports:</p>
      <table style="width:100%;border:1px solid #eee;border-radius:12px;border-collapse:separate;overflow:hidden;">${rows}</table>
      <p style="color:#889;font-size:12px;margin-top:18px;">Carson Exports &middot; 550 Windmill Rd, Dartmouth, NS &middot; Reply to this email or call us to book a test drive. Vehicles sell fast — don't wait too long!</p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from, to: [to],
        subject: `🚗 ${matches.length === 1 ? `A ${matches[0].year} ${matches[0].make} ${matches[0].model} just arrived` : `${matches.length} vehicles matching your search just arrived`} — Carson Exports`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendSms(to: string, matches: Veh[], siteUrl: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNum = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !fromNum || !to) return false;

  const first = matches[0];
  const body = matches.length === 1
    ? `Carson Exports: a ${first.year} ${first.make} ${first.model} ($${first.price.toLocaleString()}) matching your CarFinder request just arrived! ${siteUrl}/vehicle/${first.id}`
    : `Carson Exports: ${matches.length} vehicles matching your CarFinder request just arrived! See them: ${siteUrl}/inventory`;

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

export type AlertSummary = {
  requestsChecked: number;
  requestsWithNewMatches: number;
  alertsSent: number;
  webhookConfigured: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
  details: Array<{ request: string; matches: number; sent: boolean; channel: string }>;
};

export async function runMatchAlerts(sb: SupabaseClient, siteUrl: string): Promise<AlertSummary> {
  const summary: AlertSummary = {
    requestsChecked: 0, requestsWithNewMatches: 0, alertsSent: 0,
    webhookConfigured: !!process.env.ALERT_WEBHOOK_URL,
    emailConfigured: !!process.env.RESEND_API_KEY,
    smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
    details: [],
  };

  const [{ data: reqRows }, { data: vehRows }] = await Promise.all([
    sb.from('car_requests').select('*').eq('active', true),
    sb.from('vehicles').select('id, year, make, model, price, mileage, body, fuel, drive, status, hidden_override'),
  ]);
  if (!reqRows || !vehRows) return summary;

  const vehicles: Veh[] = vehRows
    .filter((v: any) => !v.hidden_override)
    .map((v: any) => ({ ...v }));

  summary.requestsChecked = reqRows.length;

  for (const row of reqRows) {
    const req = rowToRequest(row);
    const matches = newMatchesFor(vehicles, req) as Veh[];
    if (matches.length === 0) continue;
    summary.requestsWithNewMatches++;

    // Webhook first (it owns email/SMS delivery); direct providers as fallback.
    let sent = false;
    let channel = 'none';
    if (summary.webhookConfigured) {
      sent = await sendWebhook(req, matches, siteUrl);
      channel = 'webhook';
    }
    if (!sent) {
      const useSms = req.contactPref === 'sms' && req.phone;
      if (useSms) {
        sent = await sendSms(req.phone, matches, siteUrl);
        channel = 'sms';
        if (!sent && req.email) { sent = await sendEmail(req.email, req.name, matches, siteUrl); channel = 'email (sms fallback)'; }
      } else if (req.email) {
        sent = await sendEmail(req.email, req.name, matches, siteUrl);
        channel = 'email';
      }
    }

    // Only mark vehicles as notified when an alert actually went out, so
    // shoppers still get alerted once a provider is configured later.
    if (sent) {
      summary.alertsSent++;
      const notified = [...(req.notifiedVehicleIds || []), ...matches.map(m => m.id)];
      await sb.from('car_requests').update({ notified_vehicle_ids: notified }).eq('id', req.id);
    }

    summary.details.push({ request: `${req.name} — ${describeRequest(req)}`, matches: matches.length, sent, channel });
  }

  return summary;
}
