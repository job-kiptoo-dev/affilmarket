import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { RegisterSchema } from '@/lib/schemas';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth';
import { generateAffiliateToken, generateVerificationToken } from '@/lib/utils';
import { Role, UserStatus } from '@prisma/client';

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

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create verification token
    const verifyToken = generateVerificationToken();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Build create payload based on role
    const userData: any = {
      email,
      passwordHash,
      phone,
      role: role as Role,
      status: UserStatus.pending_verification,
      balance: { create: {} },
      verificationTokens: {
        create: {
          token: verifyToken,
          expiresAt: verifyExpiry,
        },
      },
    };

    if (role === 'VENDOR' || role === 'BOTH') {
      userData.vendorProfile = {
        create: {
          shopName: fullName || email.split('@')[0],
          phone,
          status: 'pending',
        },
      };
    }

    if (role === 'AFFILIATE' || role === 'BOTH') {
      userData.affiliateProfile = {
        create: {
          fullName: fullName || email.split('@')[0],
          phone,
          affiliateToken: generateAffiliateToken(),
          mpesaPhone: phone,
          status: 'pending',
        },
      };
    }

    const user = await prisma.user.create({ data: userData });

    // TODO: Send verification email via Resend
    // await sendVerificationEmail(email, verifyToken);

    // Auto-login after registration
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      signRefreshToken(user.id),
    ]);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const cookies = setAuthCookies(accessToken, refreshToken);
    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: user.id, email: user.email, role: user.role },
      },
      { status: 201 }
    );

    response.cookies.set(cookies.accessToken.name, cookies.accessToken.value, cookies.accessToken.options);
    response.cookies.set(cookies.refreshToken.name, cookies.refreshToken.value, cookies.refreshToken.options);

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
