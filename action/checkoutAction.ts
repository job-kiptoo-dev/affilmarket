'use server';

import { db }                from '@/lib/utils/db';
import { products, mpesaTransactions } from '@/drizzle/schema';
import { eq, and, sql }      from 'drizzle-orm';
import { z }                 from 'zod';
import { stkPush }           from '@/lib/mpesa';

const CheckoutSchema = z.object({
  productId:     z.string().uuid(),
  affiliateId:   z.string().uuid().nullable().optional(),
  quantity:      z.number().int().min(1).max(50),
  customerName:  z.string().min(2).max(100),
  customerPhone: z.string().min(9).max(20),
  customerEmail: z.string().email().optional().nullable(),
  city:          z.string().max(100).optional().nullable(),
  address:       z.string().max(200).optional().nullable(),
  notes:         z.string().max(500).optional().nullable(),
});

export async function initiateCheckout(payload: unknown) {
  const parsed = CheckoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  const {
    productId, affiliateId, quantity,
    customerName, customerPhone, customerEmail,
    city, address, notes,
  } = parsed.data;

  const cleanPhone = customerPhone.replace(/\s/g, '');

  // ── 1. Validate product exists, is active, has stock ──────────
  const product = await db
    .select({
      id:                     products.id,
      title:                  products.title,
      price:                  products.price,
      stockQuantity:          products.stockQuantity,
      status:                 products.status,
      vendorId:               products.vendorId,
      affiliateCommissionRate: products.affiliateCommissionRate,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product.length) {
    return { error: 'Product not found' };
  }

  const p = product[0];

  if (p.status !== 'active') {
    return { error: 'This product is no longer available' };
  }

  if (p.stockQuantity < quantity) {
    return {
      error: p.stockQuantity === 0
        ? 'This product is out of stock'
        : `Only ${p.stockQuantity} item(s) left in stock`,
    };
  }

  const totalAmount = parseFloat(p.price) * quantity;
  const intentId    = crypto.randomUUID(); // temp ID before order exists

  // ── 2. Trigger STK push FIRST — no DB writes yet ──────────────
  const stkResult = await stkPush({
    phone:   cleanPhone,
    amount:  totalAmount,
    orderId: intentId, // used for TransactionDesc only
  });

  if (stkResult.error || !stkResult.data) {
    return { error: stkResult.error ?? 'Failed to initiate M-Pesa payment' };
  }

  const { data } = stkResult;

  if (data.ResponseCode !== '0') {
    return { error: data.ResponseDescription ?? 'M-Pesa request failed' };
  }

  // ── 3. STK accepted — now store checkout metadata ─────────────
  // We store everything needed to create the order on callback
  await db.insert(mpesaTransactions).values({
    id:                crypto.randomUUID(),
    orderId:           null, // no order yet — created on callback
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    phoneNumber:       cleanPhone,
    amount:            String(totalAmount),
    status:            'PENDING',
    checkoutMetadata:  {
      productId,
      affiliateId:   affiliateId   ?? null,
      quantity,
      customerName,
      customerPhone: cleanPhone,
      customerEmail: customerEmail ?? null,
      city:          city          ?? null,
      address:       address       ?? null,
      notes:         notes         ?? null,
      vendorId:      p.vendorId,
      unitPrice:     p.price,
      affiliateCommissionRate: p.affiliateCommissionRate,
    },
  });

  return {
    success:           true,
    checkoutRequestId: data.CheckoutRequestID,
    totalAmount,
    customerPhone:     cleanPhone,
    message:           data.CustomerMessage,
  };
}
