import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queryStkPushStatus } from '@/lib/mpesa';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      mpesaTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // If already paid or failed, return immediately
  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({ status: 'PAID', orderId: order.id });
  }
  if (order.paymentStatus === 'FAILED') {
    return NextResponse.json({ status: 'FAILED', orderId: order.id });
  }

  // Poll M-Pesa for latest status
  const latestTx = order.mpesaTransactions[0];
  if (latestTx?.checkoutRequestId) {
    try {
      const stkStatus = await queryStkPushStatus(latestTx.checkoutRequestId);

      if (stkStatus.ResultCode === '0') {
        return NextResponse.json({ status: 'PAID', orderId: order.id });
      }
      if (stkStatus.ResultCode && stkStatus.ResultCode !== '0') {
        return NextResponse.json({
          status: 'FAILED',
          message: stkStatus.ResultDesc,
          orderId: order.id,
        });
      }
    } catch {
      // STK query failed — rely on webhook
    }
  }

  return NextResponse.json({ status: 'PENDING', orderId: order.id });
}
