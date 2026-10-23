import { rateLimit } from '@/lib/ratelimit';
import { fetchVehicle } from '@/lib/serverDb';
import { explainComparison } from '@/lib/carFit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Plain-English comparison of 2-3 cars on the compare page. Loads each car on
// the server, so only real, available stock is ever described.
export async function POST(req: Request) {
  if (!(await rateLimit(req, 'compare', 20, 60))) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { return Response.json({ error: 'bad request' }, { status: 400 }); }

  const raw: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  const ids = [...new Set(raw.filter((x): x is string => typeof x === 'string'))].slice(0, 3);
  if (ids.length < 2) return Response.json({ error: 'pick at least two cars' }, { status: 400 });
  const situation = typeof body.situation === 'string' ? body.situation.slice(0, 500) : '';

  const cars = (await Promise.all(ids.map(id => fetchVehicle(id)))).filter(
    (v): v is NonNullable<typeof v> => !!v && v.status === 'available'
  );
  if (cars.length < 2) return Response.json({ error: 'those cars are no longer available' }, { status: 404 });

  try {
    const text = await explainComparison(cars, situation);
    return Response.json({ text: text || 'I could not compare these right now. Please call us and we will walk you through them.' });
  } catch (e: any) {
    console.error('Compare AI error:', e?.message || e);
    return Response.json({ error: 'ai_unavailable' }, { status: 502 });
  }
}
