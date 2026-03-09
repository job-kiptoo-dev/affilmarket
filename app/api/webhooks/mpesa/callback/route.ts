import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseStkCallback } from '@/lib/mpesa';
import { computeAndSaveCommissions } from '@/lib/commission';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2));

    const result = parseStkCallback(body);

    // Find M-Pesa transaction by CheckoutRequestID
    const mpesaTx = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId: result.checkoutRequestId },
      include: { order: true },
    });

    if (!mpesaTx) {
      console.error('M-Pesa transaction not found:', result.checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Idempotency: ignore if already processed
    if (mpesaTx.status !== 'PENDING') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (result.resultCode === 0) {
      // ✅ Payment SUCCESS
      await prisma.$transaction(async (tx) => {
        // Update M-Pesa transaction
        await tx.mpesaTransaction.update({
          where: { id: mpesaTx.id },
          data: {
            status: 'SUCCESS',
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            resultCode: result.resultCode,
            resultDesc: result.resultDesc,
            rawCallback: body,
          },
        });

        // Update order payment status
        await tx.order.update({
          where: { id: mpesaTx.orderId },
          data: {
            paymentStatus: 'PAID',
            orderStatus: 'PAID',
            paymentReference: result.mpesaReceiptNumber,
            mpesaReceiptNumber: result.mpesaReceiptNumber,
          },
        });

        // Decrement stock
        await tx.product.update({
          where: { id: mpesaTx.order.productId },
          data: { stockQuantity: { decrement: mpesaTx.order.quantity } },
        });
      });

      // Compute commissions (outside transaction for isolation)
      await computeAndSaveCommissions(mpesaTx.orderId);

      // TODO: Send order confirmation email via Resend

      console.log(`✅ Order ${mpesaTx.orderId} paid via M-Pesa: ${result.mpesaReceiptNumber}`);
    } else {
      // ❌ Payment FAILED or CANCELLED
      await prisma.mpesaTransaction.update({
        where: { id: mpesaTx.id },
        data: {
          status: result.resultCode === 1032 ? 'TIMEOUT' : 'FAILED',
          resultCode: result.resultCode,
          resultDesc: result.resultDesc,
          rawCallback: body,
        },
      });

      await prisma.order.update({
        where: { id: mpesaTx.orderId },
        data: { paymentStatus: 'FAILED' },
      });

      console.log(`❌ M-Pesa payment failed for order ${mpesaTx.orderId}: ${result.resultDesc}`);
    }

    // Always respond 200 to M-Pesa
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    // Still return 200 to prevent M-Pesa retries for parse errors
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
