import { createClient } from '@supabase/supabase-js';
import { sheetCsvUrl, parseSheetToVehicles } from '@/lib/sheetSync';
import { vehicleToRow } from '@/lib/db';
import { runMatchAlerts } from '@/lib/matchAlerts';
import { SITE_URL } from '@/lib/serverDb';
import { checkSyncSecret } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// Unattended sync (for scheduled jobs). Requires:
//   SUPABASE_SERVICE_ROLE_KEY  — server-only key that can write past RLS
//   SYNC_SECRET                — shared secret (x-sync-secret header or ?secret=)
async function run(req: Request) {
  const url = new URL(req.url);
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';

  if (!process.env.SYNC_SECRET || !SERVICE_KEY) {
    return Response.json({ error: 'Scheduled sync not configured (set SYNC_SECRET and SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  }
  if (!checkSyncSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(sheetCsvUrl(url.searchParams.get('url') || undefined), { cache: 'no-store', redirect: 'follow' });
    const text = await res.text();
    if (!res.ok || text.trimStart().startsWith('<')) {
      return Response.json({ error: 'Sheet not publicly readable.' }, { status: 502 });
    }
    const { vehicles, warnings } = parseSheetToVehicles(text);
    if (vehicles.length === 0) return Response.json({ error: 'No vehicles parsed', warnings }, { status: 422 });

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const byId = new Map(vehicles.map(v => [v.id, v]));
    const rows = Array.from(byId.values()).map((v, i) => ({ ...vehicleToRow(v), sort_order: i }));
    const { error } = await sb.from('vehicles').upsert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Mirror: remove listings no longer in the sheet.
    let removed = 0;
    const { data: existing } = await sb.from('vehicles').select('id');
    if (existing) {
      const keep = new Set(rows.map(r => r.id));
      const stale = existing.map((e: any) => e.id).filter((id: string) => !keep.has(id));
      if (stale.length) { await sb.from('vehicles').delete().in('id', stale); removed = stale.length; }
    }

    // CarFinder: alert shoppers whose saved requests match the fresh inventory.
    let alerts = null;
    try {
      alerts = await runMatchAlerts(sb, SITE_URL);
    } catch { /* alerts are best-effort; never fail the sync */ }

    return Response.json({ ok: true, count: rows.length, removed, warnings, alerts, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
