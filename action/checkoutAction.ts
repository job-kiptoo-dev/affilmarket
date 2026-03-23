'use server';

import { db } from '@/lib/utils/db';
import {
  orders, products, vendorProfiles, affiliateProfiles,
  balances, platformSettings,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

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

export async function createOrder(payload: unknown) {
  const parsed = CheckoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const {
    productId, affiliateId, quantity,
    customerName, customerPhone, customerEmail,
    city, address, notes,
  } = parsed.data;

  // Fetch product
  const product = await db
    .select({
      id:                     products.id,
      price:                  products.price,
      stockQuantity:          products.stockQuantity,
      status:                 products.status,
      vendorId:               products.vendorId,
      affiliateCommissionRate: products.affiliateCommissionRate,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product.length || product[0].status !== 'active') {
    return { error: 'Product not available' };
  }

  const p = product[0];
  if (p.stockQuantity < quantity) {
    return { error: `Only ${p.stockQuantity} item(s) left in stock` };
  }

  // Fetch platform fee rate
  const feeSetting = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, 'platform_fee_rate'))
    .limit(1);

  const platformFeeRate = parseFloat(feeSetting[0]?.value ?? '0.05');
  const unitPrice       = parseFloat(p.price);
  const commRate        = parseFloat(p.affiliateCommissionRate);
  const totalAmount     = unitPrice * quantity;
  const platformFee     = totalAmount * platformFeeRate;
  const affiliateComm   = affiliateId ? totalAmount * commRate : 0;
  const platformRevenue = platformFee;
  const vendorEarnings  = totalAmount - platformFee - affiliateComm;

  const orderId = crypto.randomUUID();

  await db.insert(orders).values({
    id:                  orderId,
    vendorId:            p.vendorId,
    affiliateId:         affiliateId ?? null,
    productId:           p.id,
    price:               String(unitPrice),
    quantity,
    totalAmount:         String(totalAmount),
    customerName,
    customerPhone:       customerPhone.replace(/\s/g, ''),
    customerEmail:       customerEmail ?? null,
    city:                city ?? null,
    address:             address ?? null,
    notes:               notes ?? null,
    paymentStatus:       'PENDING',
    orderStatus:         'CREATED',
    platformFee:         String(platformFee),
    affiliateCommission: String(affiliateComm),
    vendorEarnings:      String(vendorEarnings),
    platformRevenue:     String(platformRevenue),
    commissionsComputed: true,
  });

  return { success: true, orderId, totalAmount, customerPhone };
}

export async function getOrder(orderId: string) {
  const result = await db
    .select({
      id:            orders.id,
      orderStatus:   orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      totalAmount:   orders.totalAmount,
      customerName:  orders.customerName,
      customerPhone: orders.customerPhone,
      createdAt:     orders.createdAt,
      productTitle:  products.title,
      productImage:  products.mainImageUrl,
      shopName:      vendorProfiles.shopName,
    })
    .from(orders)
    .leftJoin(products,       eq(orders.productId, products.id))
    .leftJoin(vendorProfiles, eq(orders.vendorId, vendorProfiles.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  return result[0] ?? null;
}
