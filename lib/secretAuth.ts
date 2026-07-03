// Verifies the shared SYNC_SECRET used by server-to-server cron routes.
// Accepts the secret from an `x-sync-secret` header (preferred — stays out of
// URL/access logs) or the legacy `?secret=` query param (backward compatible).
// Uses a timing-safe comparison.
import { timingSafeEqual } from 'crypto';

export function checkSyncSecret(req: Request): boolean {
  const expected = process.env.SYNC_SECRET;
  if (!expected) return false;
  let provided = req.headers.get('x-sync-secret') || '';
  if (!provided) {
    try { provided = new URL(req.url).searchParams.get('secret') || ''; } catch { /* */ }
  }
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
