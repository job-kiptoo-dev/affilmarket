import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/lib/utils/db';
import { affiliateClicks, affiliateProfiles } from '@/drizzle/schema';
import { eq }                        from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { affiliateToken, productId } = await req.json();

    if (!affiliateToken || !productId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const aff = await db
      .select({ id: affiliateProfiles.id })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.affiliateToken, affiliateToken))
      .limit(1);

    if (!aff.length) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const ipAddress = req.headers.get('x-forwarded-for')
      ?? req.headers.get('x-real-ip')
      ?? '0.0.0.0';
    const userAgent = req.headers.get('user-agent') ?? '';
    const referrer  = req.headers.get('referer')    ?? '';

    await db.insert(affiliateClicks).values({
      id:          crypto.randomUUID(),
      affiliateId: aff[0].id,
      productId,
      ipAddress,
      userAgent,
      referrer,
      cookieToken: `${affiliateToken}_${productId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[affiliate/click]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
