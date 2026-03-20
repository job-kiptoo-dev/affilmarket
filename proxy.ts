import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie }               from 'better-auth/cookies';
import {
  apiAuthPrefix, authRoutes,
  DEFAULT_LOGIN_REDIRECT, publicRoutes,
} from './routes';
import { db } from './lib/utils/db';
import { sessions, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(apiAuthPrefix)) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  const isPublic      = publicRoutes.some(r => pathname === r || pathname.startsWith(r));
  const isAuthPage    = authRoutes.some(r => pathname.startsWith(r));

  if (!sessionCookie) {
    if (isAuthPage || isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Has session cookie — look up role from DB
  if (isAuthPage || pathname === '/dashboard') {
    try {
      const token = sessionCookie.split('.')[0];
      const session = await db
        .select({ userId: sessions.userId })
        .from(sessions)
        .where(eq(sessions.token, sessionCookie))
        .limit(1);

      if (session.length) {
        const user = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, session[0].userId))
          .limit(1);

        if (user.length) {
          const role = user[0].role;
          if (role === 'ADMIN')                          return NextResponse.redirect(new URL('/admin', request.url));
          if (role === 'AFFILIATE')                      return NextResponse.redirect(new URL('/affiliate', request.url));
          if (role === 'VENDOR' || role === 'BOTH')      return NextResponse.redirect(new URL('/vendor', request.url));
        }
      }
    } catch {
      // DB lookup failed — just show the auth page
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
