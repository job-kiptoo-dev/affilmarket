import { unstable_noStore as noStore } from 'next/cache';
import { redirect }                    from 'next/navigation';
import { getAuthUser }                 from '@/lib/healpers/auth-server';
import { db }                          from '@/lib/utils/db';
import {
  affiliateProfiles, affiliateClicks,
  orders as ordersTable, products as productsTable,
  balances,
} from '@/drizzle/schema';
import { eq, desc, sql, and }          from 'drizzle-orm';
import { DashboardShell }              from '@/components/dashboard/dashboard-shell';
import { AffiliateCommissionsClient } from '@/components/affiliate/affiliate-commissions-client';

async function getCommissionsData(userId: string) {
  const profile = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, userId))
    .limit(1);

  if (!profile.length) return null;
  const { id: affiliateId, fullName, affiliateToken } = profile[0];

  const [
    balance,
    recentOrders,
    topProducts,
    monthlySales,
    clickStats,
    totalClicks,
  ] = await Promise.all([
    // balance
    db.select().from(balances).where(eq(balances.userId, userId)).limit(1),

    // recent 50 orders with commission
    db.select({
      id:                  ordersTable.id,
      createdAt:           ordersTable.createdAt,
      totalAmount:         ordersTable.totalAmount,
      affiliateCommission: ordersTable.affiliateCommission,
      orderStatus:         ordersTable.orderStatus,
      paymentStatus:       ordersTable.paymentStatus,
      customerName:        ordersTable.customerName,
      quantity:            ordersTable.quantity,
      productTitle:        productsTable.title,
      productImage:        productsTable.mainImageUrl,
      commissionRate:      productsTable.affiliateCommissionRate,
    })
      .from(ordersTable)
      .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
      .where(eq(ordersTable.affiliateId, affiliateId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(50),

    // top products by commission
    db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.main_image_url        AS image,
        p.price::float          AS price,
        p.affiliate_commission_rate::float AS commission_rate,
        COUNT(o.id)::int        AS conversions,
        COALESCE(SUM(o.affiliate_commission)::float, 0) AS total_commission,
        (
          SELECT COUNT(*)::int FROM affiliate_clicks ac
          WHERE ac.product_id = p.id AND ac.affiliate_id = ${affiliateId}
        )                       AS total_clicks
      FROM products p
      LEFT JOIN orders o
        ON o.product_id = p.id
        AND o.affiliate_id = ${affiliateId}
        AND o.payment_status = 'PAID'
      WHERE p.status = 'active'
      GROUP BY p.id, p.title, p.main_image_url, p.price, p.affiliate_commission_rate
      HAVING COUNT(o.id) > 0 OR (
        SELECT COUNT(*) FROM affiliate_clicks ac
        WHERE ac.product_id = p.id AND ac.affiliate_id = ${affiliateId}
      ) > 0
      ORDER BY total_commission DESC
      LIMIT 8
    `),

    // monthly commissions last 6 months
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY')  AS month,
        SUM(affiliate_commission)::float AS commission,
        COUNT(*)::int                   AS orders,
        DATE_TRUNC('month', created_at) AS month_date
      FROM orders
      WHERE affiliate_id    = ${affiliateId}
        AND payment_status  = 'PAID'
        AND created_at     >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),

    // clicks per day last 30 days
    db.execute(sql`
      SELECT
        DATE(created_at)    AS day,
        COUNT(*)::int       AS clicks
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `),

    // total clicks all time
    db.select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, affiliateId)),
  ]);

  const bal = balance[0];
  const paidOrders = recentOrders.filter(o => o.paymentStatus === 'PAID');
  const totalCommission  = paidOrders.reduce((s, o) => s + parseFloat(o.affiliateCommission ?? '0'), 0);
  const totalConversions = paidOrders.length;
  const clicks           = totalClicks[0]?.count ?? 0;
  const conversionRate   = clicks > 0 ? (totalConversions / clicks) * 100 : 0;

  return {
    fullName,
    affiliateToken,
    availableBalance: parseFloat(bal?.availableBalance ?? '0'),
    pendingBalance:   parseFloat(bal?.pendingBalance   ?? '0'),
    paidOutTotal:     parseFloat(bal?.paidOutTotal     ?? '0'),
    totalCommission,
    totalConversions,
    totalClicks:      clicks,
    conversionRate,
    orders: recentOrders.map(o => ({
      id:                  o.id,
      createdAt:           o.createdAt.toISOString(),
      totalAmount:         parseFloat(o.totalAmount          ?? '0'),
      affiliateCommission: parseFloat(o.affiliateCommission  ?? '0'),
      commissionRate:      parseFloat(String(o.commissionRate ?? '0.10')),
      orderStatus:         o.orderStatus,
      paymentStatus:       o.paymentStatus,
      customerName:        o.customerName,
      quantity:            o.quantity,
      productTitle:        o.productTitle ?? 'Unknown Product',
      productImage:        o.productImage ?? null,
    })),
    topProducts: (topProducts as any[]).map(p => ({
      id:              p.id,
      title:           p.title,
      image:           p.image,
      price:           p.price,
      commissionRate:  p.commission_rate,
      conversions:     p.conversions,
      totalCommission: p.total_commission,
      totalClicks:     p.total_clicks,
      conversionRate:  p.total_clicks > 0
        ? (p.conversions / p.total_clicks) * 100 : 0,
    })),
    monthlySales: (monthlySales as any[]).map(r => ({
      month:      r.month,
      commission: r.commission,
      orders:     r.orders,
    })),
    clicksByDay: (clickStats as any[]).map(r => ({
      day:    r.day,
      clicks: r.clicks,
    })),
  };
}

export default async function AffiliateCommissionsPage() {
  noStore();
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getCommissionsData(auth.sub);
  if (!data) redirect('/affiliate/onboarding');

  return (
    <DashboardShell role="AFFILIATE" vendorName={data.fullName}>
      <AffiliateCommissionsClient data={data} />
    </DashboardShell>
  );
}
