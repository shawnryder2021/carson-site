import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE = process.env.ANALYTICS_BASE || 'https://shawnryder.site';
const SITE_ID = process.env.ANALYTICS_SITE_ID || '56';

// Metrics pulled for the dashboard in one shot.
const BUNDLE = ['visitors', 'pageviews', 'page', 'referrer', 'country', 'device', 'browser', 'os'];

// Normalize any stats response into { total, rows[{label,count}] }.
function normalize(json: any): { total: number; rows: { label: string; count: number }[] } {
  const arr = Array.isArray(json) ? json : (json?.data ?? json?.stats ?? json?.results ?? []);
  const list = Array.isArray(arr) ? arr : [];
  const rows = list.map((it: any) => {
    if (it == null) return { label: '—', count: 0 };
    if (typeof it === 'number') return { label: '', count: it };
    const label = String(it.value ?? it.name ?? it.url ?? it.label ?? it.key ?? it.referrer ?? it.country ?? '—');
    const count = Number(it.count ?? it.visitors ?? it.pageviews ?? it.views ?? it.total ?? it.hits ?? 0);
    return { label, count: isNaN(count) ? 0 : count };
  });
  // Totals (visitors/pageviews) may come as a single number, an object, or buckets.
  let total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) {
    const t = json?.total ?? json?.count ?? (typeof json?.data === 'number' ? json.data : undefined);
    if (typeof t === 'number') total = t;
  }
  return { total, rows };
}

async function fetchStat(key: string, name: string, from: string, to: string) {
  const url = `${BASE}/api/v1/stats/${SITE_ID}?name=${name}&from=${from}&to=${to}&per_page=25`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${process.env.ANALYTICS_API_KEY}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [key, { error: json?.message || `HTTP ${res.status}`, total: 0, rows: [] }] as const;
    return [key, normalize(json)] as const;
  } catch (e: any) {
    return [key, { error: e?.message || 'fetch failed', total: 0, rows: [] }] as const;
  }
}

export async function GET(req: Request) {
  if (!process.env.ANALYTICS_API_KEY) {
    return Response.json({ error: 'Analytics not configured (set ANALYTICS_API_KEY).' }, { status: 503 });
  }
  if (!(await requireAdmin(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const single = url.searchParams.get('name');
  if (single) {
    const [, data] = await fetchStat(single, single, from, to);
    return Response.json({ from, to, [single]: data });
  }

  const results = await Promise.all(BUNDLE.map(n => fetchStat(n, n, from, to)));
  const out: Record<string, any> = { from, to };
  results.forEach(([k, v]) => { out[k] = v; });
  return Response.json(out);
}
