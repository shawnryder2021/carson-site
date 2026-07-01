import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sfxswebjrzzdqtuzfmvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Ss30iEcie-uEQfO58Q76Cg_TIxHy-GZ';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = pathname.startsWith('/admin');
  const isAdminLogin = pathname === '/admin/login';
  const isGarage = pathname.startsWith('/garage');
  const isGarageLogin = pathname === '/garage/login';

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

  const redirect = (path: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    if (next) url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  };

  // Customers have Supabase accounts too, so a session alone no longer means
  // admin — check admin_users membership (own-row RLS permits this lookup).
  const checkAdmin = async () => {
    const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', user!.id).maybeSingle();
    if (error) {
      // Pre-migration DB (admin_users doesn't exist yet): only admins have
      // accounts in that world, so a valid session is sufficient.
      return /admin_users/i.test(error.message) || error.code === '42P01';
    }
    return !!data;
  };

  if (isAdmin && !isAdminLogin) {
    if (!user) return redirect('/admin/login', pathname);
    if (!(await checkAdmin())) return redirect('/garage');
  }

  if (isAdminLogin && user) {
    return (await checkAdmin()) ? redirect('/admin') : redirect('/garage');
  }

  // Garage requires any signed-in session (admin or customer).
  if (isGarage && !isGarageLogin && !user) {
    return redirect('/garage/login', pathname);
  }

  if (isGarageLogin && user) {
    return redirect('/garage');
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/garage/:path*'],
};
