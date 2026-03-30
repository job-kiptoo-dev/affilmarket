import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/lib/utils/db';
import { payoutRequests, balances }  from '@/drizzle/schema';
import { eq, sql }                   from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const result = body?.Result;
    const payoutId = result?.OriginatorConversationID;

    console.warn('[b2c/timeout] payout timed out:', payoutId);

    if (!payoutId) return NextResponse.json({ ok: true });

    const payout = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, payoutId))
      .limit(1);

    if (!payout.length) return NextResponse.json({ ok: true });
    const p = payout[0];

    // Mark as rejected and refund
    await db.update(payoutRequests)
      .set({
        status:    'REJECTED',
        adminNote: 'B2C timed out — balance refunded automatically',
      })
      .where(eq(payoutRequests.id, p.id));

    await db.update(balances)
      .set({
        availableBalance: sql`${balances.availableBalance} + ${p.amount}`,
      })
      .where(eq(balances.userId, p.userId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[b2c/timeout] ERROR', err);
    return NextResponse.json({ ok: true });
  }
}
