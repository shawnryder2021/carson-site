import { isGa4Configured, getGa4Totals, getGa4EventCounts, getGa4TopSearchTerms } from '@/lib/ga4';
import { requireAdmin } from '@/lib/adminAuth';
import { checkSyncSecret } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function run(req: Request) {
  if (!isGa4Configured) {
    return Response.json({ error: 'GA4 not configured (set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY).' }, { status: 503 });
  }

  const url = new URL(req.url);

  // Auth: admin bearer token (UI) OR SYNC_SECRET (server-to-server, used by the
  // weekly digest job — no browser session available there).
  if (!checkSyncSecret(req) && !(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  try {
    const [totals, events, search] = await Promise.all([
      getGa4Totals(from, to),
      getGa4EventCounts(from, to),
      getGa4TopSearchTerms(from, to, 10),
    ]);
    return Response.json({ from, to, totals, events, search });
  } catch (e: any) {
    console.error('GA4 fetch error:', e?.message || e);
    return Response.json({ error: 'Could not load analytics data.' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
