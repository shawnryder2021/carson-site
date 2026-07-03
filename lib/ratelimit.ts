// Per-IP rate limiting for public, cost-bearing routes (AI + chat). Backed by
// Upstash Redis so limits hold across serverless instances. Designed to be
// safe in every degraded state:
//   • no env vars set  → no-op (allows everything) so the site works before
//     the owner creates the Upstash account
//   • Redis error/outage → fail OPEN (allow) so a Redis hiccup never takes down
//     the car finder or chat
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const configured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = configured ? Redis.fromEnv() : null;

// One limiter instance per named bucket, created lazily and cached.
const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, limit: number, windowSec: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${bucket}:${limit}:${windowSec}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `rl:${bucket}`,
      analytics: false,
    });
    limiters.set(key, rl);
  }
  return rl;
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('x-nf-client-connection-ip') || 'unknown';
}

// Returns true if the request is allowed, false if it should be rejected (429).
// Never throws; on any limiter error it allows the request (fail open).
export async function rateLimit(req: Request, bucket: string, limit: number, windowSec: number): Promise<boolean> {
  const rl = getLimiter(bucket, limit, windowSec);
  if (!rl) return true; // not configured → allow
  try {
    const { success } = await rl.limit(clientIp(req));
    return success;
  } catch {
    return true; // Redis outage → fail open
  }
}
