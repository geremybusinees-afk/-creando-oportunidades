import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];
const adminRoutes = ['/admin'];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rutas públicas permitidas sin autenticación
  const isPublic =
    path === '/' ||
    path === '/login' ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/favicon') ||
    path.startsWith('/public');

  if (isPublic) {
    return NextResponse.next();
  }

  // Verificar si la ruta es protegida
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  const isAdmin = adminRoutes.some((route) => path.startsWith(route));

  // Si es admin, redirigir al login si no hay sesión
  if (isAdmin) {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Si es dashboard, redirigir al login si no hay sesión
  if (isProtected) {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value
      || request.cookies.get('__Secure-next-auth.session-token')?.value;
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
