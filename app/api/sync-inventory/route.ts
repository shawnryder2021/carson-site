import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchSm360Inventory, planSm360Sync, EXISTING_COLUMNS, ExistingVehicleRow, SyncPlan } from '@/lib/sm360';
import { runMatchAlerts } from '@/lib/matchAlerts';
import { SITE_URL } from '@/lib/serverDb';
import { checkSyncSecret } from '@/lib/secretAuth';
import { requireAdmin } from '@/lib/adminAuth';
import { SUPABASE_URL } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Inventory sync from the SM360 feed (carsonexports.com).
//   GET  ?dryRun=1          → the plan only (adds / updates / mark sold), writes nothing
//   POST { dryRun?, alerts? } → apply the plan; alerts=true also runs CarFinder/watch alerts
// Auth: SYNC_SECRET (scheduled job) or a signed-in admin's bearer token.
// Needs SUPABASE_SERVICE_ROLE_KEY to write past RLS.
// Cars that leave the feed are marked sold, never deleted — deleting cascades
// to saved cars, watches and views, and sold pages keep their SEO value.

async function loadExisting(sb: SupabaseClient): Promise<{ rows: ExistingVehicleRow[]; migrationNeeded: boolean }> {
  const full = await sb.from('vehicles').select(EXISTING_COLUMNS);
  if (!full.error) return { rows: (full.data || []) as unknown as ExistingVehicleRow[], migrationNeeded: false };
  // 42703 = undefined column: supabase/migration-sm360.sql hasn't been run yet.
  // Still allow a preview, matching by year/make/model only.
  if (full.error.code !== '42703') throw new Error(full.error.message);
  const base = await sb.from('vehicles').select('id, year, make, model, price, mileage, body, fuel, drive, exterior, interior, ai_summary, images, status');
  if (base.error) throw new Error(base.error.message);
  return { rows: (base.data || []) as ExistingVehicleRow[], migrationNeeded: true };
}

async function applyPlan(sb: SupabaseClient, plan: SyncPlan) {
  const now = new Date().toISOString();
  const errors: string[] = [];

  for (let i = 0; i < plan.add.length; i += 50) {
    const rows = plan.add.slice(i, i + 50).map(a => ({ ...a.row, updated_at: now }));
    const { error } = await sb.from('vehicles').insert(rows);
    if (error) errors.push(`add: ${error.message}`);
  }
  for (const u of plan.update) {
    const { error } = await sb.from('vehicles').update({ ...u.patch, updated_at: now }).eq('id', u.id);
    if (error) errors.push(`update ${u.id}: ${error.message}`);
  }
  if (plan.markSold.length) {
    const { error } = await sb.from('vehicles').update({ status: 'sold', updated_at: now }).in('id', plan.markSold.map(s => s.id));
    if (error) errors.push(`mark sold: ${error.message}`);
  }
  return errors;
}

async function run(req: Request) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return Response.json({ error: 'Sync not configured (set SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  const viaSecret = checkSyncSecret(req);
  if (!(viaSecret || (await requireAdmin(req)))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const dryRun = req.method === 'GET' || url.searchParams.get('dryRun') === '1' || body.dryRun === true;

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const [{ cars, expected }, { rows, migrationNeeded }] = await Promise.all([fetchSm360Inventory(), loadExisting(sb)]);
    const plan = planSm360Sync(rows, cars, expected);
    const summary = {
      fetched: plan.fetched, expected: plan.expected,
      add: plan.add.length, update: plan.update.length, markSold: plan.markSold.length, unchanged: plan.unchanged,
    };

    if (dryRun) return Response.json({ dryRun: true, migrationNeeded, summary, plan });
    if (plan.blocked) return Response.json({ error: plan.blocked, summary }, { status: 422 });
    if (migrationNeeded) return Response.json({ error: 'Run supabase/migration-sm360.sql before syncing.', summary }, { status: 409 });

    const errors = await applyPlan(sb, plan);

    let alerts = null;
    if (body.alerts) {
      try { alerts = await runMatchAlerts(sb, SITE_URL); } catch { /* best-effort; never fail the sync */ }
    }
    return Response.json({ ok: errors.length === 0, summary, errors, alerts, at: new Date().toISOString() }, { status: errors.length ? 207 : 200 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
