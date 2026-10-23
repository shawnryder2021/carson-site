import { rateLimit } from '@/lib/ratelimit';
import { fetchVehicles } from '@/lib/serverDb';
import { cleanAnswers, answersFromText, findMatches } from '@/lib/carFit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// AI car finder. Loads stock on the server and asks Claude Haiku (lib/llm.ts)
// for the best three matches, either from the quiz answers or from a short
// "describe your life" note. Falls back to simple matching if the AI fails.
const MAX_TEXT = 1000;
const MAX_REFINE = 200;

export async function POST(req: Request) {
  if (!(await rateLimit(req, 'finder', 20, 60))) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { return Response.json({ error: 'bad request' }, { status: 400 }); }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const refine = typeof body.refine === 'string' ? body.refine.slice(0, MAX_REFINE) : undefined;
  if (text.length > MAX_TEXT) return Response.json({ error: 'message too long' }, { status: 400 });
  if (!text && !body.answers) return Response.json({ error: 'nothing to match on' }, { status: 400 });

  const answers = text ? answersFromText(text) : cleanAnswers(body.answers);
  const stock = await fetchVehicles();
  const result = await findMatches(answers, stock, refine);
  return Response.json(result);
}
