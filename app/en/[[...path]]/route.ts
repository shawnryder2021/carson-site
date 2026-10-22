import { legacyRedirect } from '@/lib/legacyRedirect';

// Old carsonexports.com (SM360) /en/... URLs → their new home (301). See lib/legacyUrls.ts.
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { path?: string[] } }) {
  return legacyRedirect(req, params.path, 'en');
}
export const HEAD = GET;
