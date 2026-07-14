// Server-only: builds and sends the weekly "new arrivals that match your
// taste" email to garage users. Infers each user's taste from their SAVED
// vehicles (the client "Because you saved…" logic ported to run off the DB),
// finds inventory added since their last digest that matches, and emails the
// top few — with a one-click unsubscribe. Mirrors the shape of lib/reportDigest
// and the Resend/escaping patterns in lib/matchAlerts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { matchesRequest, CarRequest } from './carMatch';
import { escapeHtml } from './escapeHtml';
import { signUnsub } from './unsubToken';
import { vehicleImageURL } from '../data/vehicleImage';

const DAY = 86400000;

type Veh = {
  id: string; year: number; make: string; model: string;
  price: number; mileage: number; body: string; fuel: string; drive: string;
  images: any; status: string; hidden_override?: boolean; created_at?: string;
};

function firstPhoto(v: Veh): string {
  const arr = Array.isArray(v.images) ? v.images : [];
  const url = arr.find((x: any) => typeof x === 'string' && /^https?:\/\//.test(x));
  return url || vehicleImageURL(v as any, { size: 240 });
}

function freq(vals: string[]): [string, number][] {
  const counts = new Map<string, number>();
  vals.forEach(v => v && counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Port of buildRecommendations() from the garage page, DB-only (no localStorage
// recently-viewed signal available server-side).
function inferRequest(saved: Veh[]): { pseudo: CarRequest; priceFloor: number; median: number } | null {
  if (saved.length === 0) return null;
  const topBody = freq(saved.map(s => s.body))[0];
  const topMake = freq(saved.map(s => s.make))[0];
  const prices = saved.map(s => s.price).filter(n => n > 0);
  if (prices.length === 0) return null;
  const priceMax = Math.round(Math.max(...prices) * 1.2);
  const priceFloor = Math.round(Math.min(...prices) * 0.7);
  const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
  const pseudo: CarRequest = {
    name: '', email: '', phone: '', contactPref: 'email',
    body: topBody ? topBody[0] : '',
    make: topMake && topMake[1] >= 2 ? topMake[0] : '',
    model: '', yearMin: null, priceMax, mileageMax: null,
    fuel: '', drive: '', notes: '', active: true, notifiedVehicleIds: [],
  };
  return { pseudo, priceFloor, median };
}

async function sendDigestEmail(to: string, name: string, matches: Veh[], siteUrl: string, userId: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERT_FROM_EMAIL || 'Carson Exports <onboarding@resend.dev>';
  const firstName = name ? escapeHtml(name.split(' ')[0]) : 'there';
  const unsubUrl = `${siteUrl}/api/garage-digest/unsubscribe?u=${encodeURIComponent(userId)}&t=${signUnsub(userId)}`;

  const rows = matches.map(v => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;vertical-align:top;width:96px;">
        <img src="${firstPhoto(v)}" alt="" width="84" style="width:84px;height:63px;object-fit:cover;border-radius:8px;background:#f5f5f5;" />
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;">
        <div style="font-weight:700;font-size:15px;color:#111;">${escapeHtml(`${v.year} ${v.make} ${v.model}`)}</div>
        <div style="font-size:13px;color:#667;margin-top:2px;">$${v.price.toLocaleString()} &middot; ${v.mileage.toLocaleString()} km &middot; ${escapeHtml(v.fuel)} &middot; ${escapeHtml(v.drive)}</div>
        <a href="${siteUrl}/vehicle/${v.id}" style="display:inline-block;margin-top:8px;background:#1E8FC4;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:7px 13px;border-radius:8px;">View this vehicle</a>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:580px;margin:0 auto;">
      <h2 style="color:#111;margin:0 0 6px;">New arrivals for you, ${firstName} 🚗</h2>
      <p style="color:#445;font-size:14px;line-height:1.6;margin:0 0 16px;">Based on the vehicles you've saved, ${matches.length === 1 ? 'a new arrival' : `${matches.length} new arrivals`} just landed at Carson Exports that ${matches.length === 1 ? 'looks' : 'look'} like your kind of thing:</p>
      <table style="width:100%;border:1px solid #eee;border-radius:12px;border-collapse:separate;overflow:hidden;">${rows}</table>
      <p style="text-align:center;margin:20px 0 6px;">
        <a href="${siteUrl}/garage?tab=saved" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:10px 20px;border-radius:8px;">Open my garage</a>
      </p>
      <p style="color:#889;font-size:11.5px;line-height:1.6;margin:18px 0 0;text-align:center;">
        Carson Exports &middot; 550 Windmill Rd, Dartmouth, NS<br/>
        You're getting this because you saved vehicles in your garage.
        <a href="${unsubUrl}" style="color:#889;">Unsubscribe</a> &middot;
        <a href="${siteUrl}/garage?tab=profile" style="color:#889;">Email preferences</a>
      </p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from, to: [to],
        subject: matches.length === 1
          ? `🚗 A ${matches[0].year} ${matches[0].make} ${matches[0].model} you might love — Carson Exports`
          : `🚗 ${matches.length} new arrivals that match your taste — Carson Exports`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function buildAndSendGarageDigest(sb: SupabaseClient, siteUrl: string): Promise<{ considered: number; emailsSent: number }> {
  const [{ data: userPage }, { data: admins }, { data: profiles }, { data: saved }, { data: vehicles }] = await Promise.all([
    sb.auth.admin.listUsers({ perPage: 1000 }),
    sb.from('admin_users').select('user_id'),
    sb.from('profiles').select('id, name, digest_opt_out, digest_last_sent_at'),
    sb.from('saved_vehicles').select('user_id, vehicle_id'),
    sb.from('vehicles').select('id, year, make, model, price, mileage, body, fuel, drive, images, status, hidden_override, created_at'),
  ]);

  const adminIds = new Set((admins || []).map((a: any) => a.user_id));
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
  const vehById = new Map<string, Veh>((vehicles || []).map((v: any) => [v.id, v]));
  const allVehicles = (vehicles || []) as Veh[];

  const savesByUser = new Map<string, string[]>();
  (saved || []).forEach((r: any) => {
    const arr = savesByUser.get(r.user_id) || [];
    arr.push(r.vehicle_id);
    savesByUser.set(r.user_id, arr);
  });

  const now = Date.now();
  const defaultWindow = now - 7 * DAY;
  let considered = 0;
  let emailsSent = 0;

  for (const u of userPage?.users || []) {
    try {
      if (adminIds.has(u.id) || !u.email) continue;
      const prof = profileById.get(u.id);
      if (prof?.digest_opt_out) continue;

      const savedIds = savesByUser.get(u.id) || [];
      if (savedIds.length === 0) continue;
      considered++;

      const savedVehs = savedIds.map(id => vehById.get(id)).filter(Boolean) as Veh[];
      const inf = inferRequest(savedVehs);
      if (!inf) continue;

      const windowStart = prof?.digest_last_sent_at ? new Date(prof.digest_last_sent_at).getTime() : defaultWindow;
      const savedSet = new Set(savedIds);

      const matches = allVehicles
        .filter(v => v.created_at && new Date(v.created_at).getTime() > windowStart)
        .filter(v => !savedSet.has(v.id) && !v.hidden_override && v.price >= inf.priceFloor && matchesRequest(v as any, inf.pseudo))
        .sort((a, b) => Math.abs(a.price - inf.median) - Math.abs(b.price - inf.median))
        .slice(0, 6);

      if (matches.length === 0) continue;

      const ok = await sendDigestEmail(u.email, prof?.name || '', matches, siteUrl, u.id);
      if (ok) {
        emailsSent++;
        await sb.from('profiles').update({ digest_last_sent_at: new Date().toISOString() }).eq('id', u.id);
      }
    } catch { /* one user's failure never aborts the run */ }
  }

  return { considered, emailsSent };
}
