import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }

  const cleared = clearAuthCookies();
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set(cleared.accessToken.name, cleared.accessToken.value, cleared.accessToken.options as any);
  response.cookies.set(cleared.refreshToken.name, cleared.refreshToken.value, cleared.refreshToken.options as any);
  return response;
}
