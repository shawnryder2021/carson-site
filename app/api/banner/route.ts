import { requireAdminClient, kieKey, createKieTask, getKieTask, saveKieImage } from '@/lib/kie';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const KEY = kieKey();
  if (!KEY) return Response.json({ error: 'Banner generation not configured (set KIE_API_KEY).' }, { status: 503 });

  const sb = await requireAdminClient(req);
  if (!sb) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || 'generate';

  try {
    // ── 1) Kick off a generation (kie.ai unified jobs API, GPT Image 2) ──
    if (action === 'generate') {
      const prompt = (body.prompt || '').trim();
      if (!prompt) return Response.json({ error: 'A prompt is required.' }, { status: 400 });
      const aspect = ['1:1', '3:2', '2:3', '16:9'].includes(body.size) ? body.size : '3:2';
      const { taskId, error } = await createKieTask(KEY, prompt, aspect);
      if (error) return Response.json({ error }, { status: 502 });
      return Response.json({ taskId });
    }

    // ── 2) Poll a task ──
    if (action === 'status') {
      const taskId = body.taskId;
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      return Response.json(await getKieTask(KEY, taskId));
    }

    // ── 3) Persist a chosen image into Supabase Storage (kie URLs expire in 14 days) ──
    if (action === 'save') {
      const url = body.url;
      if (!url) return Response.json({ error: 'url required' }, { status: 400 });
      const { publicUrl, error, status } = await saveKieImage(sb, url, 'banners');
      if (error) return Response.json({ error }, { status: status || 500 });
      return Response.json({ publicUrl });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Banner request failed' }, { status: 500 });
  }
}
