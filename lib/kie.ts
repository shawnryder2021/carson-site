// kie.ai (GPT Image 2) helpers shared by banner and vehicle image generation.
// Flow: createKieTask → poll getKieTask until done → copy the result into
// Supabase Storage (kie URLs expire after 14 days).

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase/config';

export const KIE_CREATE = 'https://api.kie.ai/api/v1/jobs/createTask';
export const KIE_RECORD = 'https://api.kie.ai/api/v1/jobs/recordInfo';
export const KIE_MODEL = 'gpt-image-2-text-to-image';

// Recursively pull image URLs out of kie.ai's record-info response, which
// has varied across versions (data.response.resultUrls, data.resultUrls,
// data.info.result_urls, …). We gather every http(s) string and keep the
// image-looking ones, preferring keys that mention result/url/image.
export function extractImageUrls(obj: any): string[] {
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

// Returns an authed, RLS-scoped client only if the caller is an ADMIN (not
// just any logged-in customer). Fails closed on any error.
export async function requireAdminClient(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return null;
  const { data: admin, error } = await sb.from('admin_users').select('user_id').eq('user_id', u.user.id).maybeSingle();
  if (error || !admin) return null;
  return sb;
}

// SSRF guard for the "save" action — only fetch images from kie.ai and the
// CDN hosts its results live on, never an arbitrary caller-supplied URL.
export function isAllowedImageHost(u: string): boolean {
  try {
    const { protocol, hostname } = new URL(u);
    if (protocol !== 'https:') return false;
    return /(^|\.)kie\.ai$/.test(hostname)
      || hostname.endsWith('.r2.dev')
      || hostname.endsWith('.r2.cloudflarestorage.com')
      || hostname.endsWith('.amazonaws.com')
      || hostname.endsWith('.cloudfront.net')
      || hostname.includes('redpanda')
      || hostname.includes('tempfile');
  } catch {
    return false;
  }
}

// Strip quotes/whitespace a Netlify env value might carry (a common cause
// of kie.ai "Authentication failed").
export function kieKey(): string {
  return (process.env.KIE_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

export async function createKieTask(key: string, prompt: string, aspect: string): Promise<{ taskId?: string; error?: string }> {
  const res = await fetch(KIE_CREATE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: KIE_MODEL, input: { prompt, aspect_ratio: aspect } }),
  });
  const json = await res.json().catch(() => ({}));
  const taskId = json?.data?.taskId || json?.data?.task_id || json?.taskId;
  if (!res.ok || !taskId) {
    console.error('kie.ai generate failed:', res.status, json?.msg || json?.message);
    return { error: 'Generation failed to start. Please try again.' };
  }
  return { taskId };
}

export async function getKieTask(key: string, taskId: string): Promise<{ status: 'done'; urls: string[] } | { status: 'failed'; error: string } | { status: 'pending' }> {
  const res = await fetch(`${KIE_RECORD}?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json().catch(() => ({}));
  const data = json?.data ?? json;
  const urls = extractImageUrls(data);
  // jobs API uses `state`: waiting | queuing | generating | success | fail
  const state = String(data?.state || data?.status || '').toLowerCase();
  if (urls.length > 0) return { status: 'done', urls };
  if (state.includes('fail') || state.includes('error')) {
    return { status: 'failed', error: data?.failMsg || data?.errorMessage || data?.failCode || 'Generation failed.' };
  }
  return { status: 'pending' };
}

// Download a kie.ai result (allowed hosts only) and store it in the public
// `media` bucket under `folder/`. Uses the caller's admin-scoped client.
export async function saveKieImage(sb: any, url: string, folder: string): Promise<{ publicUrl?: string; error?: string; status?: number }> {
  if (!isAllowedImageHost(url)) return { error: 'Unsupported image source.', status: 400 };
  const imgRes = await fetch(url);
  if (!imgRes.ok) return { error: 'Could not download the generated image.', status: 502 };
  const contentType = imgRes.headers.get('content-type') || 'image/png';
  const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, bytes, { cacheControl: '3600', contentType, upsert: false });
  if (error) return { error: error.message, status: 500 };
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
