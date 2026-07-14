import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { verifyUnsub } from '@/lib/unsubToken';

export const dynamic = 'force-dynamic';

// One-click unsubscribe from the garage digest. Reached from the email footer
// link (no login) — a signed token proves the user id, then we flip their
// profiles.digest_opt_out via the service role. Returns a small HTML page.
function page(title: string, body: string, ok: boolean): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
  <body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
    <div style="max-width:460px;margin:12vh auto;background:#fff;border:1px solid #e8e8e8;border-radius:16px;padding:36px 30px;text-align:center;">
      <div style="font-size:40px;margin-bottom:10px;">${ok ? '✅' : '⚠️'}</div>
      <h1 style="font-size:20px;margin:0 0 8px;color:#111;">${title}</h1>
      <p style="font-size:14.5px;color:#666;line-height:1.6;margin:0 0 22px;">${body}</p>
      <a href="/garage?tab=profile" style="display:inline-block;background:#1E8FC4;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px;">Manage email preferences</a>
    </div>
  </body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('u') || '';
  const token = url.searchParams.get('t') || '';

  if (!verifyUnsub(userId, token)) {
    return page('Link expired', 'This unsubscribe link is invalid or expired. You can manage your email preferences from your garage instead.', false);
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return page('Something went wrong', 'We couldn’t update your preferences right now. Please try again from your garage.', false);
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from('profiles').update({ digest_opt_out: true }).eq('id', userId);
    if (error) throw error;
  } catch {
    return page('Something went wrong', 'We couldn’t update your preferences right now. Please try again from your garage.', false);
  }

  return page("You're unsubscribed", "You won't receive the weekly new-arrival email anymore. You can turn it back on anytime in My Garage.", true);
}
