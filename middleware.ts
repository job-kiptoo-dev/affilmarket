// import { NextRequest, NextResponse } from 'next/server';
// import { auth } from './lib/auth';
// // import { auth } from '@/lib/auth';
//
// const protectedPaths = {
//   '/vendor': ['VENDOR', 'BOTH', 'ADMIN'],
//   '/affiliate': ['AFFILIATE', 'BOTH', 'ADMIN'],
//   '/admin': ['ADMIN'],
// };
//
// export async function proxy(req: NextRequest) {
//   const { pathname } = req.nextUrl;
//
//   const matchedPath = Object.keys(protectedPaths).find((path) =>
//     pathname.startsWith(path)
//   );
//
//   if (!matchedPath) return NextResponse.next();
//
//   // Better Auth reads the session from the cookie — no JWT, no expiry issues
//   const session = await auth.api.getSession({ headers: req.headers });
//
//   if (!session) {
//     const loginUrl = new URL('/login', req.url);
//     loginUrl.searchParams.set('redirect', pathname);
//     return NextResponse.redirect(loginUrl);
//   }
//
//   const role = (session.user as any).role as string;
//   const allowedRoles = protectedPaths[matchedPath as keyof typeof protectedPaths];
//
//   if (!allowedRoles.includes(role)) {
//     if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
//     if (role === 'AFFILIATE') return NextResponse.redirect(new URL('/affiliate', req.url));
//     return NextResponse.redirect(new URL('/vendor', req.url));
//   }
//
//   return NextResponse.next();
// }
//
// export const config = {
//   matcher: ['/vendor/:path*', '/affiliate/:path*', '/admin/:path*'],
// };
//

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie }               from 'better-auth/cookies';
import {
  apiAuthPrefix, authRoutes,
  DEFAULT_LOGIN_REDIRECT, publicRoutes,
} from './routes';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API auth routes
  if (pathname.startsWith(apiAuthPrefix)) return NextResponse.next();

  const session    = getSessionCookie(request);
  const isPublic   = publicRoutes.some(r => pathname === r || pathname.startsWith(r));
  const isAuthPage = authRoutes.some(r => pathname.startsWith(r));

  // On auth pages: if session cookie exists → go to dashboard
  if (isAuthPage) {
    if (session) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url));
    return NextResponse.next();
  }

  // On protected pages: if no session cookie → go to login
  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname); // preserve intended destination
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
