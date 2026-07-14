// One-click unsubscribe tokens for the garage digest email. A token is an
// HMAC of the user id keyed on SYNC_SECRET, so an email link can flip a user's
// opt-out without a login and without being guessable/enumerable. Same
// timing-safe primitive used by lib/secretAuth.ts.
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return process.env.SYNC_SECRET || '';
}

export function signUnsub(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex');
}

export function verifyUnsub(userId: string, token: string): boolean {
  if (!secret() || !userId || !token) return false;
  const expected = signUnsub(userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
