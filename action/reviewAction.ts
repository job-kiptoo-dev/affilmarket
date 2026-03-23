'use server';

import { db }             from '@/lib/utils/db';
import { reviews, orders, products, vendorProfiles } from '@/drizzle/schema';
import { eq, avg, sql }   from 'drizzle-orm';
import { z }              from 'zod';
import { revalidatePath } from 'next/cache';

const ReviewSchema = z.object({
  orderId:    z.string().uuid(),
  rating:     z.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional().nullable(),
});

export async function submitReview(payload: unknown) {
  const parsed = ReviewSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { orderId, rating, reviewText } = parsed.data;

  // Verify order exists and is DELIVERED
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order.length) return { error: 'Order not found' };

  const o = order[0];

  if (o.orderStatus !== 'DELIVERED') {
    return { error: 'You can only review after the order is delivered' };
  }

  // Check not already reviewed
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.orderId, orderId))
    .limit(1);

  if (existing.length) return { error: 'You have already reviewed this order' };

  // Create review
  await db.insert(reviews).values({
    id:         crypto.randomUUID(),
    orderId,
    productId:  o.productId,
    vendorId:   o.vendorId,
    rating,
    reviewText: reviewText ?? null,
  });

  // Update vendor avg rating
  const vendorAvg = await db
    .select({ avg: sql<number>`avg(rating)::numeric(3,2)` })
    .from(reviews)
    .where(eq(reviews.vendorId, o.vendorId));

  if (vendorAvg[0]?.avg) {
    await db.update(vendorProfiles)
      .set({ avgRating: String(vendorAvg[0].avg) })
      .where(eq(vendorProfiles.id, o.vendorId));
  }

  revalidatePath(`/products`);
  return { success: true };
}

export async function getProductReviews(productId: string) {
  return db
    .select({
      id:         reviews.id,
      rating:     reviews.rating,
      reviewText: reviews.reviewText,
      createdAt:  reviews.createdAt,
      // We don't expose customer name — keep it anonymous
    })
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(sql`${reviews.createdAt} desc`)
    .limit(20);
}

export async function getProductRatingSummary(productId: string) {
  const result = await db
    .select({
      avgRating:   sql<number>`round(avg(rating)::numeric, 1)`,
      totalReviews: sql<number>`count(*)::int`,
      five:  sql<number>`count(*) filter (where rating = 5)::int`,
      four:  sql<number>`count(*) filter (where rating = 4)::int`,
      three: sql<number>`count(*) filter (where rating = 3)::int`,
      two:   sql<number>`count(*) filter (where rating = 2)::int`,
      one:   sql<number>`count(*) filter (where rating = 1)::int`,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  return result[0] ?? null;
}
