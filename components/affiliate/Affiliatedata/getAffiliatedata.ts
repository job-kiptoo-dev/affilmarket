import { db } from '@/lib/utils/db';
import {
  affiliateProfiles, affiliateClicks, orders as ordersTable,
  balances, products as productsTable,
  // products,
} from '@/drizzle/schema';
import { and, desc, eq, sql } from 'drizzle-orm';


export async function getAffiliateData(userId: string) {
  const [aff] = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, userId))
    .limit(1);

  if (!aff) {
    return { status: 'not_onboarded' } as const;
  }

  if (aff.status === 'suspended') {
    return { status: 'suspended' } as const;
  }

  if (aff.status !== 'active') {
    return { status: 'pending' } as const;
  }

  const [
    clickCount,
    orderCount,
    balance,
    recentCommissions,
    clicksOverTime,
    topProducts,
  ] = await Promise.all([
    // clicks count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, aff.id)),

    // paid orders count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.affiliateId, aff.id),
          eq(ordersTable.paymentStatus, 'PAID'),
        ),
      ),

    // balance
    db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1),

    // recent commissions (indexed)
    db
      .select({
        id: ordersTable.id,
        createdAt: ordersTable.createdAt,
        totalAmount: ordersTable.totalAmount,
        affiliateCommission: ordersTable.affiliateCommission,
        balancesReleased: ordersTable.balancesReleased,
        productTitle: productsTable.title,
      })
      .from(ordersTable)
      .innerJoin(
        productsTable,
        eq(ordersTable.productId, productsTable.id),
      )
      .where(
        and(
          eq(ordersTable.affiliateId, aff.id),
          eq(ordersTable.paymentStatus, 'PAID'),
        ),
      )
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),

    // clicks over time
    db.execute(sql`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*)::int AS count
      FROM affiliate_clicks
      WHERE affiliate_id = ${aff.id}
      AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1
      ORDER BY 1
    `),

    // top products (optimized grouping)
    db
      .select({
        productId: affiliateClicks.productId,
        clicks: sql<number>`count(*)::int`,
        productTitle: productsTable.title,
        productSlug: productsTable.slug,
        productImage: productsTable.mainImageUrl,
        price: productsTable.price,
        commRate: productsTable.affiliateCommissionRate,
      })
      .from(affiliateClicks)
      .innerJoin(
        productsTable,
        eq(affiliateClicks.productId, productsTable.id),
      )
      .where(eq(affiliateClicks.affiliateId, aff.id))
      .groupBy(
        affiliateClicks.productId,
        productsTable.id,
      )
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ]);

  let bal = balance[0];

  if (!bal) {
   const [balan] = await db
      .insert(balances)
      .values({
        id: crypto.randomUUID(),
        userId,
        availableBalance: '0.00',
        pendingBalance: '0.00',
        paidOutTotal: '0.00',
      })
      .returning();

      bal = balan
  }

  return {
    status: 'active',
    profile: aff,
    clickCount: clickCount[0]?.count ?? 0,
    orderCount: orderCount[0]?.count ?? 0,
    balance: bal,
    recentCommissions,
    clicksOverTime: clicksOverTime as any[],
    topProducts,
  } as const;
}
