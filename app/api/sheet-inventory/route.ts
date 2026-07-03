import { sheetCsvUrl, parseSheetToVehicles } from '@/lib/sheetSync';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET: fetch the configured Google Sheet, parse it, return mapped vehicles.
// Used by the admin "Sync from Google Sheet" button (reads only — the client
// then upserts via the authenticated admin session). Admin-gated because it
// fetches a URL server-side and returns the body (SSRF surface otherwise).
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const override = url.searchParams.get('url') || undefined;
  const csvUrl = sheetCsvUrl(override);

  try {
    const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store' });
    if (!res.ok) {
      return Response.json({
        error: `Couldn't read the sheet (HTTP ${res.status}). Make sure it's shared as "Anyone with the link → Viewer" or published to the web.`,
        csvUrl,
      }, { status: 502 });
    }
    const text = await res.text();
    // Google returns an HTML login page (not CSV) when the sheet isn't public.
    if (text.trimStart().startsWith('<')) {
      return Response.json({
        error: 'The sheet is not publicly readable. In Google Sheets: Share → General access → "Anyone with the link → Viewer" (or File → Share → Publish to web).',
        csvUrl,
      }, { status: 403 });
    }
    const result = parseSheetToVehicles(text);
    return Response.json({ ...result, csvUrl, count: result.vehicles.length });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Failed to fetch sheet', csvUrl }, { status: 500 });
  }
}
