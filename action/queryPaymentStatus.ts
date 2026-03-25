

'use server';

import { db }                from '@/lib/utils/db';
import { mpesaTransactions } from '@/drizzle/schema';
import { eq }                from 'drizzle-orm';
import { stkQuery }          from '@/lib/mpesa';

export async function queryPaymentStatus(checkoutRequestId: string) {
  try {
    const txn = await db
      .select({
        status:     mpesaTransactions.status,
        orderId:    mpesaTransactions.orderId,
        resultCode: mpesaTransactions.resultCode,
        resultDesc: mpesaTransactions.resultDesc,
      })
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId))
      .limit(1);

    if (txn.length) {
      if (txn[0].status === 'SUCCESS') {
        return { status: 'PAID', orderId: txn[0].orderId };
      }
      if (txn[0].status === 'FAILED') {
        return {
          status: 'CANCELLED',
          reason: txn[0].resultDesc ?? 'Payment was not completed',
        };
      }
    }

    // Callback hasn't arrived — query Safaricom directly
    const result = await stkQuery(checkoutRequestId);
    if (result.error) return { status: 'PENDING' };

    const code = Number(result.data?.ResultCode);
    const desc = result.data?.ResultDesc ?? '';

    if (code === 0)    return { status: 'PAID' };
    if (code === 1032) return { status: 'CANCELLED', reason: desc || 'You cancelled the payment prompt' };
    if (code === 1037) return { status: 'CANCELLED', reason: desc || 'The payment request timed out' };

    return { status: 'PENDING' };
  } catch {
    return { status: 'PENDING' };
  }
}
