import { createClient } from '@supabase/supabase-js';
import { sheetCsvUrl, parseSheetToVehicles } from '@/lib/sheetSync';
import { vehicleToRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Unattended sync (for scheduled jobs). Requires:
//   SUPABASE_SERVICE_ROLE_KEY  — server-only key that can write past RLS
//   SYNC_SECRET                — shared secret; caller must pass ?secret=...
async function run(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const SYNC_SECRET = process.env.SYNC_SECRET;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';

  if (!SYNC_SECRET || !SERVICE_KEY) {
    return Response.json({ error: 'Scheduled sync not configured (set SYNC_SECRET and SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  }
  if (secret !== SYNC_SECRET) {
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
    const rows = vehicles.map((v, i) => ({ ...vehicleToRow(v), sort_order: i }));
    const { error } = await sb.from('vehicles').upsert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, count: rows.length, warnings, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
