import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CheckoutSchema } from '@/lib/schemas';
import { initiateStkPush, phoneToMpesaFormat } from '@/lib/mpesa';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      productId,
      quantity,
      customerName,
      customerPhone,
      customerEmail,
      city,
      address,
      notes,
      affiliateToken,
    } = parsed.data;

    // Validate product
    const product = await prisma.product.findUnique({
      where: { id: productId, status: 'active' },
      include: { vendor: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 });
    }

    if (product.stockQuantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // Resolve affiliate
    let affiliateId: string | null = null;
    if (affiliateToken) {
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { affiliateToken, status: 'active' },
      });
      if (affiliate) affiliateId = affiliate.id;
    }

    // Also check cookie-based affiliate token
    if (!affiliateId) {
      const cookieToken = req.cookies.get('aff_token')?.value;
      if (cookieToken) {
        const affiliate = await prisma.affiliateProfile.findUnique({
          where: { affiliateToken: cookieToken, status: 'active' },
        });
        if (affiliate) affiliateId = affiliate.id;
      }
    }

    const totalAmount = product.price.toNumber() * quantity;

    // Create order
    const order = await prisma.order.create({
      data: {
        vendorId: product.vendorId,
        affiliateId,
        productId,
        price: product.price,
        quantity,
        totalAmount,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        city,
        address,
        notes,
        paymentStatus: 'PENDING',
        orderStatus: 'CREATED',
      },
    });

    // Initiate M-Pesa STK Push
    const mpesaPhone = phoneToMpesaFormat(customerPhone);

    const stkResponse = await initiateStkPush({
      phone: mpesaPhone,
      amount: totalAmount,
      orderId: order.id,
      description: `AffilMarket-${order.id.slice(0, 8)}`,
    });

    // Store M-Pesa transaction record
    await prisma.mpesaTransaction.create({
      data: {
        orderId: order.id,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        phoneNumber: mpesaPhone,
        amount: totalAmount,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      orderId: order.id,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      message: 'STK Push sent to your phone. Complete the M-Pesa payment.',
      amount: totalAmount,
    });
  } catch (error: any) {
    console.error('Order create error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
