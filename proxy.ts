import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];
const adminRoutes = ['/admin'];
const publicRoutes = ['/', '/login', '/register'];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  const isAdmin = adminRoutes.some((route) => path.startsWith(route));
  const isPublic = publicRoutes.some((route) => path === route);

  const sessionToken = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (isAdmin && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
