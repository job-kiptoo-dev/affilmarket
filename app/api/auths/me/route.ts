import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      vendorProfile: {
        select: { id: true, shopName: true, status: true, logoUrl: true },
      },
      affiliateProfile: {
        select: { id: true, fullName: true, affiliateToken: true, status: true },
      },
      balance: {
        select: { pendingBalance: true, availableBalance: true, paidOutTotal: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
