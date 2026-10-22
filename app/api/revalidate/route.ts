import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/adminAuth';
import { checkSyncSecret } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// Refresh cached server-rendered pages right after an admin edit, instead of
// waiting for their hourly revalidation. POST { paths: ['/news', '/news/slug'] }
// or { all: true }. Admin token or SYNC_SECRET.
export async function POST(req: Request) {
  if (!(checkSyncSecret(req) || (await requireAdmin(req)))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.all) {
    revalidatePath('/', 'layout');
    return Response.json({ ok: true, revalidated: 'all' });
  }
  const paths: string[] = Array.isArray(body.paths) ? body.paths.filter((p: any) => typeof p === 'string' && p.startsWith('/')).slice(0, 20) : [];
  paths.forEach(p => revalidatePath(p));
  return Response.json({ ok: true, revalidated: paths });
}
