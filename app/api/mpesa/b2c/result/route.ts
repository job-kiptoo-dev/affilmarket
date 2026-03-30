import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/lib/utils/db';
import { payoutRequests, balances }  from '@/drizzle/schema';
import { eq, sql }                   from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const result = body?.Result;

    if (!result) return NextResponse.json({ ok: true });

    const {
      ResultCode,
      ResultDesc,
      OriginatorConversationID, // this is the payoutId we sent
      TransactionID,
      ResultParameters,
    } = result;

    console.log('[b2c/result]', { ResultCode, OriginatorConversationID });

    // Find the payout by the ID we passed as OriginatorConversationID
    const payout = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, OriginatorConversationID))
      .limit(1);

    if (!payout.length) {
      console.warn('[b2c/result] payout not found:', OriginatorConversationID);
      return NextResponse.json({ ok: true });
    }

    const p = payout[0];

    if (ResultCode === 0) {
      // ── SUCCESS ──────────────────────────────────────────────
      console.log('[b2c/result] SUCCESS — TransactionID:', TransactionID);

      await db.update(payoutRequests)
        .set({
          status:    'PAID',
          adminNote: `M-Pesa B2C confirmed — Txn: ${TransactionID}`,
        })
        .where(eq(payoutRequests.id, p.id));

      // Increment paidOutTotal
      await db.update(balances)
        .set({
          paidOutTotal: sql`${balances.paidOutTotal} + ${p.amount}`,
        })
        .where(eq(balances.userId, p.userId));

    } else {
      // ── FAILED — refund balance back ─────────────────────────
      console.warn('[b2c/result] FAILED:', ResultDesc);

      await db.update(payoutRequests)
        .set({
          status:    'REJECTED',
          adminNote: `B2C failed: ${ResultDesc}`,
        })
        .where(eq(payoutRequests.id, p.id));

      // Give the money back to the user
      await db.update(balances)
        .set({
          availableBalance: sql`${balances.availableBalance} + ${p.amount}`,
        })
        .where(eq(balances.userId, p.userId));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[b2c/result] ERROR', err);
    return NextResponse.json({ ok: true });
  }
}
