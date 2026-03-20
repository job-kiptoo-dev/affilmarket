'use server';

import { db }                from '@/lib/utils/db';
import { orders, mpesaTransactions } from '@/drizzle/schema';
import { eq }                from 'drizzle-orm';
import { stkPush, stkQuery } from '@/lib/mpesa';

export async function initiateMpesaPayment(
  orderId:  string,
  phone:    string,
  amount:   number,
) {
  try {
    const result = await stkPush({ phone, amount, orderId });

    if (result.error) {
      return { error: result.error };
    }

    const { data } = result;

    // ResponseCode '0' means the request was accepted by Safaricom
    if (data.ResponseCode !== '0') {
      return { error: data.ResponseDescription ?? 'M-Pesa request failed' };
    }

    // Record the pending transaction
    await db.insert(mpesaTransactions).values({
      id:                crypto.randomUUID(),
      orderId,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      phoneNumber:       phone,
      amount:            String(amount),
      status:            'PENDING',
    });

    return {
      success:           true,
      checkoutRequestId: data.CheckoutRequestID,
      message:           data.CustomerMessage,
    };
  } catch (err) {
    console.error('[initiateMpesaPayment]', err);
    return { error: 'Failed to initiate payment. Please try again.' };
  }
}

export async function queryPaymentStatus(
  checkoutRequestId: string,
  orderId:           string,
) {
  try {
    const result = await stkQuery(checkoutRequestId);

    if (result.error) return { status: 'PENDING' };

    const { data } = result;
    const code = Number(data.ResultCode);

    if (code === 0) {
      // ── Payment confirmed ────────────────────────────────────
      await db.update(orders)
        .set({ paymentStatus: 'PAID', orderStatus: 'CONFIRMED' })
        .where(eq(orders.id, orderId));

      await db.update(mpesaTransactions)
        .set({
          status:             'SUCCESS',
          mpesaReceiptNumber: data.MpesaReceiptNumber ?? null,
          resultCode:         0,
          resultDesc:         data.ResultDesc,
        })
        .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId));

      return { status: 'PAID' };
    }

    if (code === 1032) {
      // ── Cancelled by user ────────────────────────────────────
      await db.update(mpesaTransactions)
        .set({ status: 'FAILED', resultCode: 1032, resultDesc: 'Cancelled by user' })
        .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId));

      return { status: 'CANCELLED' };
    }

    if (code === 1037) {
      // ── Timeout ──────────────────────────────────────────────
      await db.update(mpesaTransactions)
        .set({ status: 'FAILED', resultCode: 1037, resultDesc: 'Request timed out' })
        .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId));

      return { status: 'CANCELLED' };
    }

    // Still pending — query returned but payment not done yet
    return { status: 'PENDING' };

  } catch (err) {
    console.error('[queryPaymentStatus]', err);
    return { status: 'PENDING' };
  }
}
