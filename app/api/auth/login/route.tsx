import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const GET = toNextJsHandler(auth).GET;

// Intercept POST to add suspended account check before forwarding to Better Auth
export async function POST(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/api/auth/sign-in/email') {
    const body = await req.clone().json();
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { status: true },
    });
    if (user?.status === 'suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Contact support.' },
        { status: 403 }
      );
    }
  }

  return toNextJsHandler(auth).POST(req);
}
