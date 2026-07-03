import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safeNext';

export const dynamic = 'force-dynamic';

// Completes magic-link / email-confirmation sign-in: exchanges the PKCE code
// for a session cookie, then sends the shopper where they were headed.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  // Only allow same-site relative redirects.
  const next = safeNext(url.searchParams.get('next'), '/garage');

  if (code) {
    const sb = getServerClient();
    if (sb) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL('/garage/login?error=link', url.origin));
}
