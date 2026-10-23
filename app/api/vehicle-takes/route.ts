import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { checkSyncSecret } from '@/lib/secretAuth';
import { requireAdmin } from '@/lib/adminAuth';
import { generateMissingTakes } from '@/lib/carsonTake';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Write "Carson's take" descriptions for cars that don't have one yet.
// POST { limit? } — admin token or SYNC_SECRET. Returns how many remain.
export async function POST(req: Request) {
  if (!(checkSyncSecret(req) || (await requireAdmin(req)))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return Response.json({ error: 'Not configured' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const result = await generateMissingTakes(sb, Math.min(Math.max(Number(body.limit) || 12, 1), 20));
  if (result.written) revalidatePath('/', 'layout');
  return Response.json(result);
}
