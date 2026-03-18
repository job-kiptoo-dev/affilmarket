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

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "./routes";

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);

  const isApiAuth = request.nextUrl.pathname.startsWith(apiAuthPrefix);

  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  const isAuthRoute = () => {
    return authRoutes.some((path) => request.nextUrl.pathname.startsWith(path));
  };

  if (isApiAuth) {
    return NextResponse.next();
  }

  if (isAuthRoute()) {
    if (session) {
      return NextResponse.redirect(
        new URL(DEFAULT_LOGIN_REDIRECT, request.url),
      );
    }
    return NextResponse.next();
  }

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

