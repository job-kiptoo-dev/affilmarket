import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/auth';

const protectedPaths = {
  '/vendor': ['VENDOR', 'BOTH', 'ADMIN'],
  '/affiliate': ['AFFILIATE', 'BOTH', 'ADMIN'],
  '/admin': ['ADMIN'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if path needs protection
  const matchedPath = Object.keys(protectedPaths).find((path) =>
    pathname.startsWith(path)
  );

  if (!matchedPath) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAccessToken(token);

  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = protectedPaths[matchedPath as keyof typeof protectedPaths];
  if (!allowedRoles.includes(payload.role)) {
    // Redirect to appropriate dashboard
    if (payload.role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
    if (payload.role === 'AFFILIATE') return NextResponse.redirect(new URL('/affiliate', req.url));
    return NextResponse.redirect(new URL('/vendor', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vendor/:path*', '/affiliate/:path*', '/admin/:path*'],
};
