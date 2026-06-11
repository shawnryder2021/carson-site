import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ss30iEcie-uEQfO58Q76Cg_TIxHy-GZ';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard /admin (but never the login page itself)
  const isAdmin = pathname.startsWith('/admin');
  const isLogin = pathname === '/admin/login';

  // If Supabase isn't configured, let everything through (site still works)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in and trying to reach a protected admin page → login
  if (isAdmin && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in and on the login page → dashboard
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
