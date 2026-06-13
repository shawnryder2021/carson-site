import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KIE_CREATE = 'https://api.kie.ai/api/v1/jobs/createTask';
const KIE_RECORD = 'https://api.kie.ai/api/v1/jobs/recordInfo';
const KIE_MODEL = 'gpt-image-2-text-to-image';

// Recursively pull image URLs out of kie.ai's record-info response, which
// has varied across versions (data.response.resultUrls, data.resultUrls,
// data.info.result_urls, …). We gather every http(s) string and keep the
// image-looking ones, preferring keys that mention result/url/image.
function extractImageUrls(obj: any): string[] {
  const ranked: { url: string; score: number }[] = [];
  const walk = (node: any, key = '') => {
    if (node == null) return;
    if (typeof node === 'string') {
      if (/^https?:\/\//i.test(node)) {
        const k = key.toLowerCase();
        let score = 0;
        if (/result|image|origin/.test(k) && /url/.test(k)) score = 3;
        else if (/url/.test(k)) score = 2;
        if (/\.(png|jpe?g|webp)(\?|$)/i.test(node)) score += 2;
        if (/tempfile|kie|redpanda|\.r2\.|amazonaws|cloudfront/i.test(node)) score += 1;
        if (score > 0) ranked.push({ url: node, score });
      }
      return;
    }
    if (Array.isArray(node)) { node.forEach(n => walk(n, key)); return; }
    if (typeof node === 'object') {
      // Some fields are JSON-encoded strings (e.g. response: "{...}").
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string' && /^\s*[\[{]/.test(v)) {
          try { walk(JSON.parse(v), k); continue; } catch { /* not json */ }
        }
        walk(v, k);
      }
    }
  };
  walk(obj);
  // De-dupe, highest score first.
  const seen = new Set<string>();
  return ranked.sort((a, b) => b.score - a.score)
    .filter(r => (seen.has(r.url) ? false : seen.add(r.url)))
    .map(r => r.url);
}

async function requireAdmin(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await sb.auth.getUser(token);
  return data?.user ? sb : null;
}

export async function POST(req: Request) {
  // Strip quotes/whitespace a Netlify env value might carry (a common cause
  // of kie.ai "Authentication failed").
  const KEY = (process.env.KIE_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!KEY) return Response.json({ error: 'Banner generation not configured (set KIE_API_KEY).' }, { status: 503 });

  const sb = await requireAdmin(req);
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

      const res = await fetch(KIE_CREATE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: KIE_MODEL, input: { prompt, aspect_ratio: aspect } }),
      });
      const json = await res.json().catch(() => ({}));
      const taskId = json?.data?.taskId || json?.data?.task_id || json?.taskId;
      if (!res.ok || !taskId) {
        const msg = json?.msg || json?.message || 'Generation failed to start.';
        // Surface kie's HTTP status + key length (not the key) for diagnosis.
        return Response.json({ error: `${msg} [kie HTTP ${res.status}; key length ${KEY.length}]` }, { status: 502 });
      }
      return Response.json({ taskId });
    }

    // ── 2) Poll a task ──
    if (action === 'status') {
      const taskId = body.taskId;
      if (!taskId) return Response.json({ error: 'taskId required' }, { status: 400 });
      const res = await fetch(`${KIE_RECORD}?taskId=${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      const urls = extractImageUrls(data);
      // jobs API uses `state`: waiting | queuing | generating | success | fail
      const state = String(data?.state || data?.status || '').toLowerCase();

      if (urls.length > 0) return Response.json({ status: 'done', urls });
      if (state.includes('fail') || state.includes('error')) {
        return Response.json({ status: 'failed', error: data?.failMsg || data?.errorMessage || data?.failCode || 'Generation failed.' });
      }
      return Response.json({ status: 'pending' });
    }

    // ── 3) Persist a chosen image into Supabase Storage (kie URLs expire in 14 days) ──
    if (action === 'save') {
      const url = body.url;
      if (!url) return Response.json({ error: 'url required' }, { status: 400 });
      const imgRes = await fetch(url);
      if (!imgRes.ok) return Response.json({ error: 'Could not download the generated image.' }, { status: 502 });
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from('media').upload(path, bytes, { cacheControl: '3600', contentType, upsert: false });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      const { data } = sb.storage.from('media').getPublicUrl(path);
      return Response.json({ publicUrl: data.publicUrl });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Banner request failed' }, { status: 500 });
  }
}
