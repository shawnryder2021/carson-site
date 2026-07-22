// Signed tokens for booking actions reachable from an email link without a
// login (cancel). HMAC of the booking id keyed on SYNC_SECRET — not guessable
// or enumerable. Same timing-safe primitive as lib/unsubToken.ts / secretAuth.
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return process.env.SYNC_SECRET || '';
}

export function signBooking(id: string): string {
  return createHmac('sha256', secret()).update(id).digest('hex');
}

export function verifyBooking(id: string, token: string): boolean {
  if (!secret() || !id || !token) return false;
  const expected = signBooking(id);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
