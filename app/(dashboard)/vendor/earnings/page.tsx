import { unstable_noStore as noStore } from 'next/cache';
import { redirect }                    from 'next/navigation';
import { getAuthUser }                 from '@/lib/healpers/auth-server';
import { db }                          from '@/lib/utils/db';
import {
  vendorProfiles, orders as ordersTable,
  products as productsTable, balances,
} from '@/drizzle/schema';
import { eq, desc, sql }               from 'drizzle-orm';
import { DashboardShell }              from '@/components/dashboard/dashboard-shell';
import { VendorEarningsClient }        from '@/components/vendor/vendor-earnings-client';

async function getEarningsData(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName, isOnboarded: vendorProfiles.isOnboarded })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length || !vendor[0].isOnboarded) return null;
  const { id: vendorId, shopName } = vendor[0];

  const [balance, recentOrders, topProducts, monthlySales] = await Promise.all([
    // balance
    db.select().from(balances).where(eq(balances.userId, userId)).limit(1),

    // recent 50 paid orders with earnings
    db.select({
      id:             ordersTable.id,
      createdAt:      ordersTable.createdAt,
      totalAmount:    ordersTable.totalAmount,
      vendorEarnings: ordersTable.vendorEarnings,
      platformFee:    ordersTable.platformFee,
      affiliateCommission: ordersTable.affiliateCommission,
      orderStatus:    ordersTable.orderStatus,
      paymentStatus:  ordersTable.paymentStatus,
      customerName:   ordersTable.customerName,
      quantity:       ordersTable.quantity,
      productTitle:   productsTable.title,
      productImage:   productsTable.mainImageUrl,
    })
      .from(ordersTable)
      .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
      .where(eq(ordersTable.vendorId, vendorId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(50),

    // top products by revenue
    db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.main_image_url AS image,
        COUNT(o.id)::int              AS order_count,
        SUM(o.vendor_earnings)::float AS total_earnings,
        SUM(o.quantity)::int          AS units_sold
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.vendor_id     = ${vendorId}
        AND o.payment_status = 'PAID'
      GROUP BY p.id, p.title, p.main_image_url
      ORDER BY total_earnings DESC
      LIMIT 5
    `),

    // monthly revenue last 6 months
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY')   AS month,
        SUM(vendor_earnings)::float      AS earnings,
        SUM(total_amount)::float         AS revenue,
        COUNT(*)::int                    AS orders
      FROM orders
      WHERE vendor_id      = ${vendorId}
        AND payment_status = 'PAID'
        AND created_at    >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),
  ]);

  const bal = balance[0];
  const paidOrders = recentOrders.filter(o => o.paymentStatus === 'PAID');
  const totalEarnings = paidOrders.reduce((s, o) => s + parseFloat(o.vendorEarnings ?? '0'), 0);
  const totalRevenue  = paidOrders.reduce((s, o) => s + parseFloat(o.totalAmount   ?? '0'), 0);
  const totalFees     = paidOrders.reduce((s, o) => s + parseFloat(o.platformFee   ?? '0'), 0);
  const totalCommissions = paidOrders.reduce((s, o) => s + parseFloat(o.affiliateCommission ?? '0'), 0);

  return {
    shopName,
    availableBalance:  parseFloat(bal?.availableBalance  ?? '0'),
    pendingBalance:    parseFloat(bal?.pendingBalance    ?? '0'),
    paidOutTotal:      parseFloat(bal?.paidOutTotal      ?? '0'),
    totalEarnings,
    totalRevenue,
    totalFees,
    totalCommissions,
    totalOrders: recentOrders.length,
    paidOrders:  paidOrders.length,
    orders: recentOrders.map(o => ({
      id:             o.id,
      createdAt:      o.createdAt.toISOString(),
      totalAmount:    parseFloat(o.totalAmount    ?? '0'),
      vendorEarnings: parseFloat(o.vendorEarnings ?? '0'),
      platformFee:    parseFloat(o.platformFee    ?? '0'),
      affiliateCommission: parseFloat(o.affiliateCommission ?? '0'),
      orderStatus:    o.orderStatus,
      paymentStatus:  o.paymentStatus,
      customerName:   o.customerName,
      quantity:       o.quantity,
      productTitle:   o.productTitle  ?? 'Unknown Product',
      productImage:   o.productImage  ?? null,
    })),
    topProducts: (topProducts as any[]).map(p => ({
      id:            p.id,
      title:         p.title,
      image:         p.image,
      orderCount:    p.order_count,
      totalEarnings: p.total_earnings,
      unitsSold:     p.units_sold,
    })),
    monthlySales: (monthlySales as any[]).map(r => ({
      month:    r.month,
      earnings: r.earnings,
      revenue:  r.revenue,
      orders:   r.orders,
    })),
  };
}

export default async function VendorEarningsPage() {
  noStore();
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getEarningsData(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.shopName}>
      <VendorEarningsClient data={data} />
    </DashboardShell>
  );
}
