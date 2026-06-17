// Server-only: match active CarFinder requests against current inventory
// and send email (Resend) / SMS (Twilio) alerts. Called from API routes
// with a service-role Supabase client.
import type { SupabaseClient } from '@supabase/supabase-js';
import { CarRequest, newMatchesFor, describeRequest } from './carMatch';

type Veh = { id: string; year: number; make: string; model: string; price: number; mileage: number; body: string; fuel: string; drive: string; status?: string; images?: string[] };

// DB-configured webhook (Admin → CarFinder) wins; env var is the fallback.
async function getWebhookUrl(sb: SupabaseClient): Promise<string> {
  try {
    const { data } = await sb.from('site_settings').select('alert_webhook_url').eq('id', 1).maybeSingle();
    if (data?.alert_webhook_url) return data.alert_webhook_url;
  } catch { /* column may not exist yet */ }
  return process.env.ALERT_WEBHOOK_URL || '';
}

// Fires a sample payload at the configured webhook so the owner can verify
// their Zapier/Make/GHL flow end-to-end before any real shopper signs up.
export async function sendTestWebhook(sb: SupabaseClient, siteUrl: string): Promise<{ ok: boolean; webhookUrl: string }> {
  const webhookUrl = await getWebhookUrl(sb);
  if (!webhookUrl) return { ok: false, webhookUrl: '' };
  const sample: CarRequest = {
    id: 'test', name: 'Test Shopper', email: 'test@example.com', phone: '(902) 555-0123',
    contactPref: 'email', body: 'SUV', make: 'Toyota', model: 'RAV4',
    yearMin: 2019, priceMax: 30000, mileageMax: null, fuel: '', drive: 'AWD',
    notes: 'This is a test alert from Carson Exports admin.', active: true, notifiedVehicleIds: [],
  };
  const sampleVeh: Veh = { id: 'test-vehicle', year: 2021, make: 'Toyota', model: 'RAV4', price: 28500, mileage: 64000, body: 'SUV', fuel: 'Gas', drive: 'AWD' };
  const ok = await sendWebhook(webhookUrl, sample, [sampleVeh], siteUrl);
  return { ok, webhookUrl };
}

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
// any automation tool) which delivers the email or text. Configured in
// Admin → CarFinder (site_settings.alert_webhook_url) or ALERT_WEBHOOK_URL env.
async function sendWebhook(url: string, req: CarRequest, matches: Veh[], siteUrl: string): Promise<boolean> {
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
        <a href="${siteUrl}/vehicle/${v.id}" style="display:inline-block;margin-top:8px;background:#1E8FC4;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;">View this vehicle</a>
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
  watchesChecked: number;
  watchAlertsSent: number;
  webhookConfigured: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
  details: Array<{ request: string; matches: number; sent: boolean; channel: string }>;
};

// ── Watch-this-car alerts (price drops + sold notices) ──

type WatchRow = {
  id: string; vehicle_id: string; name: string; email: string; phone: string;
  contact_pref: 'email' | 'sms'; last_notified_price: number; active: boolean;
};

async function sendWatchWebhook(url: string, kind: 'price_drop' | 'sold', w: WatchRow, v: Veh, siteUrl: string): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: kind === 'price_drop' ? 'vehicle.price_drop' : 'vehicle.sold',
        at: new Date().toISOString(),
        contact: { name: w.name, email: w.email, phone: w.phone, preferredChannel: w.contact_pref },
        vehicle: {
          id: v.id,
          title: `${v.year} ${v.make} ${v.model}`,
          price: v.price,
          previousPrice: w.last_notified_price,
          savings: Math.max(0, w.last_notified_price - v.price),
          mileageKm: v.mileage,
          url: `${siteUrl}/vehicle/${v.id}`,
          image: v.images?.[0] || null,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendWatchEmail(kind: 'price_drop' | 'sold', w: WatchRow, v: Veh, siteUrl: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !w.email) return false;
  const from = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';
  const title = `${v.year} ${v.make} ${v.model}`;
  const subject = kind === 'price_drop'
    ? `📉 Price drop: ${title} is now $${v.price.toLocaleString()} — Carson Exports`
    : `${title} just sold — but we can find you another`;
  const body = kind === 'price_drop'
    ? `<p>Good news${w.name ? ', ' + w.name.split(' ')[0] : ''} — the <strong>${title}</strong> you're watching just dropped from <s>$${w.last_notified_price.toLocaleString()}</s> to <strong>$${v.price.toLocaleString()}</strong> (save $${(w.last_notified_price - v.price).toLocaleString()}).</p>
       <p><a href="${siteUrl}/vehicle/${v.id}" style="display:inline-block;background:#1E8FC4;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;">See the new price</a></p>
       <p style="color:#889;font-size:12px;">Price drops attract attention — this one may not last. Carson Exports · 550 Windmill Rd, Dartmouth, NS</p>`
    : `<p>${w.name ? w.name.split(' ')[0] + ', the' : 'The'} <strong>${title}</strong> you were watching has been sold. Want us to watch for a similar one? <a href="${siteUrl}/carfinder">Set up a CarFinder alert</a> and you'll get first dibs.</p>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: [w.email], subject, html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;font-size:14.5px;line-height:1.6;color:#222;">${body}</div>` }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function runWatchAlerts(sb: SupabaseClient, siteUrl: string, webhookUrl: string, summary: AlertSummary) {
  const { data: watches } = await sb.from('vehicle_watches').select('*').eq('active', true);
  if (!watches || watches.length === 0) return;
  const ids = Array.from(new Set(watches.map((w: any) => w.vehicle_id)));
  const { data: vehs } = await sb.from('vehicles')
    .select('id, year, make, model, price, mileage, body, fuel, drive, status, images')
    .in('id', ids);
  const byId = new Map((vehs || []).map((v: any) => [v.id, v as Veh]));

  summary.watchesChecked = watches.length;

  for (const w of watches as WatchRow[]) {
    const v = byId.get(w.vehicle_id);
    if (!v) continue; // vehicle removed; cascade will clean up eventually
    const sold = v.status === 'sold';
    const dropped = !sold && v.price < w.last_notified_price;
    if (!sold && !dropped) continue;

    const kind = sold ? 'sold' as const : 'price_drop' as const;
    let sent = false;
    if (webhookUrl) sent = await sendWatchWebhook(webhookUrl, kind, w, v, siteUrl);
    if (!sent) sent = await sendWatchEmail(kind, w, v, siteUrl);

    if (sent) {
      summary.watchAlertsSent++;
      if (sold) await sb.from('vehicle_watches').update({ active: false }).eq('id', w.id);
      else await sb.from('vehicle_watches').update({ last_notified_price: v.price }).eq('id', w.id);
    }
    summary.details.push({
      request: `${w.name || w.email || w.phone} watching ${v.year} ${v.make} ${v.model}`,
      matches: 1, sent, channel: webhookUrl ? 'webhook' : 'email',
    });
  }
}

export async function runMatchAlerts(sb: SupabaseClient, siteUrl: string): Promise<AlertSummary> {
  const webhookUrl = await getWebhookUrl(sb);
  const summary: AlertSummary = {
    requestsChecked: 0, requestsWithNewMatches: 0, alertsSent: 0,
    watchesChecked: 0, watchAlertsSent: 0,
    webhookConfigured: !!webhookUrl,
    emailConfigured: !!process.env.RESEND_API_KEY,
    smsConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
    details: [],
  };

  const [{ data: reqRows }, { data: vehRows }] = await Promise.all([
    sb.from('car_requests').select('*').eq('active', true),
    sb.from('vehicles').select('id, year, make, model, price, mileage, body, fuel, drive, status, hidden_override'),
  ]);
  if (!reqRows || !vehRows) {
    await runWatchAlerts(sb, siteUrl, webhookUrl, summary).catch(() => {});
    return summary;
  }

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
      sent = await sendWebhook(webhookUrl, req, matches, siteUrl);
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

  // Watch-this-car alerts ride along on every run.
  await runWatchAlerts(sb, siteUrl, webhookUrl, summary).catch(() => {});

  return summary;
}
