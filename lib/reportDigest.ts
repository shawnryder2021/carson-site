// Server-only: builds and sends the weekly report digest email via Resend.
// Mirrors lib/matchAlerts.ts — takes a SupabaseClient argument rather than
// constructing one, since this runs with no browser session (cron trigger
// or an admin's "send test digest" button).
import type { SupabaseClient } from '@supabase/supabase-js';
import { isGa4Configured, getGa4Totals, getGa4EventCounts } from './ga4';

const DAY = 86400000;

type LeadRow = { id: string; type: string; created_at: string; vehicle_id: string | null };
type VehicleRow = { id: string; year: number; make: string; model: string; price: number; status: string; views: number; created_at: string; hidden_override?: boolean };
type PriceRow = { vehicle_id: string; price: number; recorded_at: string };

export type DigestResult = {
  sent: boolean;
  to: string;
  emailConfigured: boolean;
  ga4Included: boolean;
};

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function renderGa4Html(totals: { sessions: number; pageviews: number; users: number }, events: Record<string, number>): string {
  return `
    <h3 style="color:#111;font-size:16px;margin:24px 0 8px;">Traffic (Google Analytics)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
      <tr><td style="padding:4px 0;color:#667;">Sessions</td><td style="padding:4px 0;text-align:right;font-weight:700;">${totals.sessions.toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#667;">Pageviews</td><td style="padding:4px 0;text-align:right;font-weight:700;">${totals.pageviews.toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#667;">Users</td><td style="padding:4px 0;text-align:right;font-weight:700;">${totals.users.toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#667;">Searches</td><td style="padding:4px 0;text-align:right;font-weight:700;">${(events.search || 0).toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#667;">Vehicle views</td><td style="padding:4px 0;text-align:right;font-weight:700;">${(events.view_item || 0).toLocaleString()}</td></tr>
      <tr><td style="padding:4px 0;color:#667;">Leads generated</td><td style="padding:4px 0;text-align:right;font-weight:700;">${(events.generate_lead || 0).toLocaleString()}</td></tr>
    </table>`;
}

function renderDigestHtml(opts: {
  leadRows: LeadRow[];
  vehRows: VehicleRow[];
  priceRows: PriceRow[];
  ga4Section: string;
  from: Date;
  to: Date;
}): string {
  const { leadRows, vehRows, priceRows, ga4Section, from, to } = opts;

  const typeCounts: Record<string, number> = {};
  leadRows.forEach(l => { typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });
  const typeRows = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span style="display:inline-block;background:#e6f3fb;color:#15688f;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;margin:0 6px 6px 0;text-transform:capitalize;">${t}: ${n}</span>`)
    .join('');

  const active = vehRows.filter(v => v.status !== 'sold' && v.status !== 'hidden' && !v.hidden_override);
  const aging = active
    .map(v => ({ v, days: Math.max(0, Math.floor((Date.now() - new Date(v.created_at).getTime()) / DAY)) }))
    .filter(x => x.days >= 30)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  const agingRows = aging.map(({ v, days }) => `
    <tr>
      <td style="padding:6px 0;color:${days >= 60 ? '#A8232C' : '#8A5400'};font-weight:800;">${days}d</td>
      <td style="padding:6px 0 6px 12px;">${v.year} ${v.make} ${v.model} — $${v.price.toLocaleString()}</td>
    </tr>`).join('');

  const soldCount = vehRows.filter(v => v.status === 'sold').length;
  const priceChanges = priceRows.length;

  return `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
      <h2 style="color:#111;margin-bottom:4px;">Weekly report — Carson Exports</h2>
      <p style="color:#889;font-size:13px;margin:0 0 20px;">${ymd(from)} → ${ymd(to)}</p>

      <h3 style="color:#111;font-size:16px;margin:0 0 8px;">Leads (${leadRows.length})</h3>
      <div style="margin-bottom:8px;">${typeRows || '<span style="color:#889;font-size:13px;">No leads this week.</span>'}</div>

      <h3 style="color:#111;font-size:16px;margin:24px 0 8px;">Inventory &amp; pricing</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:8px;">
        <tr><td style="padding:4px 0;color:#667;">Active vehicles</td><td style="padding:4px 0;text-align:right;font-weight:700;">${active.length}</td></tr>
        <tr><td style="padding:4px 0;color:#667;">Sold (current total)</td><td style="padding:4px 0;text-align:right;font-weight:700;">${soldCount}</td></tr>
        <tr><td style="padding:4px 0;color:#667;">Price changes this week</td><td style="padding:4px 0;text-align:right;font-weight:700;">${priceChanges}</td></tr>
      </table>
      ${aging.length > 0 ? `
        <div style="font-size:12px;color:#667;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin:12px 0 6px;">Aging stock (30+ days)</div>
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;">${agingRows}</table>` : ''}

      ${ga4Section}

      <p style="color:#889;font-size:12px;margin-top:24px;">Carson Exports · 550 Windmill Rd, Dartmouth, NS &middot; This is an automated weekly summary from your admin dashboard.</p>
    </div>`;
}

export async function buildAndSendDigest(sb: SupabaseClient, siteUrl: string, overrideTo?: string): Promise<DigestResult> {
  const key = process.env.RESEND_API_KEY;
  const emailConfigured = !!key;

  const to = new Date();
  const from = new Date(to.getTime() - 7 * DAY);
  const fromIso = from.toISOString();

  const [{ data: leadRows }, { data: vehRows }, { data: priceRows }, { data: settingsRow }] = await Promise.all([
    sb.from('leads').select('id, type, created_at, vehicle_id').gte('created_at', fromIso),
    sb.from('vehicles').select('id, year, make, model, price, status, views, created_at, hidden_override'),
    sb.from('price_history').select('vehicle_id, price, recorded_at').gte('recorded_at', fromIso),
    sb.from('site_settings').select('contact_email').eq('id', 1).maybeSingle(),
  ]);

  const recipient = overrideTo || settingsRow?.contact_email || '';
  if (!recipient) return { sent: false, to: '', emailConfigured, ga4Included: false };

  let ga4Section = '';
  let ga4Included = false;
  if (isGa4Configured) {
    try {
      const [totals, events] = await Promise.all([
        getGa4Totals(ymd(from), ymd(to)),
        getGa4EventCounts(ymd(from), ymd(to)),
      ]);
      ga4Section = renderGa4Html(totals, events);
      ga4Included = true;
    } catch {
      // Omit the traffic section gracefully — the rest of the digest still sends.
    }
  }

  const html = renderDigestHtml({
    leadRows: leadRows || [],
    vehRows: vehRows || [],
    priceRows: priceRows || [],
    ga4Section,
    from,
    to,
  });

  if (!emailConfigured) return { sent: false, to: recipient, emailConfigured, ga4Included };

  const fromEmail = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `Weekly report — Carson Exports (${ymd(from)} → ${ymd(to)})`,
      html,
    }),
  });

  return { sent: res.ok, to: recipient, emailConfigured, ga4Included };
}
