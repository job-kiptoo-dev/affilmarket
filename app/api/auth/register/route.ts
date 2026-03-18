import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RegisterSchema } from '@/lib/schemas';
import { generateAffiliateToken } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, phone, role, fullName } = parsed.data;
    const name = fullName || email.split('@')[0];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Use Better Auth's internal handler to create the user + account record
    const signUpRequest = new Request(
      new URL('/api/auth/sign-up/email', req.url),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone }),
      }
    );

    const authResponse = await auth.handler(signUpRequest);

    if (!authResponse.ok) {
      const err = await authResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || 'Registration failed' },
        { status: authResponse.status }
      );
    }

    // Get the newly created user to build profiles
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found after creation' }, { status: 500 });
    }

    // Create balance + profiles in parallel (same as before)
    await Promise.all([
      prisma.balance.create({ data: { userId: user.id } }),

      ...(role === 'VENDOR' || role === 'BOTH'
        ? [prisma.vendorProfile.create({
            data: { userId: user.id, shopName: name, phone, status: 'pending' },
          })]
        : []),

      ...(role === 'AFFILIATE' || role === 'BOTH'
        ? [prisma.affiliateProfile.create({
            data: {
              userId: user.id,
              fullName: name,
              phone,
              affiliateToken: generateAffiliateToken(),
              mpesaPhone: phone,
              status: 'pending',
            },
          })]
        : []),
    ]);

    // TODO: sendVerificationEmail(email, token);

    // Return Better Auth's response — it already contains the session cookie
    return authResponse;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
