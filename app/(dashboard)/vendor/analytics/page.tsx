export const dynamic = 'force-dynamic';

import { redirect }      from 'next/navigation';
import Link              from 'next/link';
import { getAuthUser }   from '@/lib/healpers/auth-server';
import { db }            from '@/lib/utils/db';
import {
  vendorProfiles, orders as ordersTable,
  products as productsTable, affiliateProfiles,
  affiliateClicks, users,
} from '@/drizzle/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatsCard }      from '@/components/dashboard/stats-card';
import { SalesChart }     from '@/components/charts/sales-chart';
import {
  TrendingUp, ShoppingCart, Package, Users,
  MousePointer, Star, ArrowUpRight, BarChart2,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}
function pct(a: number, b: number) {
  if (!b) return '0%';
  return `${((a / b) * 100).toFixed(1)}%`;
}

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function getAnalyticsData(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length) return null;
  const { id: vendorId, shopName } = vendor[0];

  const [
    // Revenue & orders
    revenueStats,
    // Monthly revenue — last 12 months
    monthlySales,
    // Order status breakdown
    orderFunnel,
    // Top products by revenue
    topProducts,
    // Affiliate performance for this vendor's products
    affiliateStats,
    // Click → order conversion
    conversionStats,
    // Average order value over time
    avgOrderValue,
  ] = await Promise.all([

    // ── Overall revenue stats ─────────────────────────────────────────────
    db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN vendor_earnings::numeric ELSE 0 END), 0)::float
          AS "totalEarnings",
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount::numeric   ELSE 0 END), 0)::float
          AS "totalGmv",
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN affiliate_commission::numeric ELSE 0 END), 0)::float
          AS "totalCommissionPaid",
        COUNT(*)::int                                            AS "totalOrders",
        COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END)::int AS "paidOrders",
        COUNT(CASE WHEN order_status   = 'CANCELLED' THEN 1 END)::int AS "cancelledOrders",
        COALESCE(AVG(CASE WHEN payment_status = 'PAID' THEN total_amount::numeric END), 0)::float
          AS "avgOrderValue",
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' AND payment_status = 'PAID' THEN 1 END)::int
          AS "ordersLast30Days",
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' AND payment_status = 'PAID'
          THEN vendor_earnings::numeric ELSE 0 END), 0)::float
          AS "earningsLast30Days"
      FROM orders
      WHERE vendor_id = ${vendorId}
    `),

    // ── Monthly sales — last 12 months ────────────────────────────────────
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY')                        AS month,
        SUM(vendor_earnings::numeric)::float                 AS total,
        COUNT(*)::int                                        AS count
      FROM orders
      WHERE vendor_id      = ${vendorId}
        AND payment_status = 'PAID'
        AND created_at    >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `),

    // ── Order funnel ──────────────────────────────────────────────────────
    db.execute(sql`
      SELECT order_status AS status, COUNT(*)::int AS count
      FROM orders
      WHERE vendor_id = ${vendorId}
      GROUP BY order_status
      ORDER BY count DESC
    `),

    // ── Top 5 products by revenue ─────────────────────────────────────────
    db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.main_image_url                                    AS "imageUrl",
        p.price::float                                      AS price,
        COUNT(o.id)::int                                    AS orders,
        COALESCE(SUM(o.vendor_earnings::numeric), 0)::float AS earnings,
        COALESCE(AVG(o.total_amount::numeric),    0)::float AS "avgOrderValue"
      FROM products p
      LEFT JOIN orders o ON o.product_id = p.id AND o.payment_status = 'PAID'
      WHERE p.vendor_id = ${vendorId}
      GROUP BY p.id, p.title, p.main_image_url, p.price
      ORDER BY earnings DESC
      LIMIT 5
    `),

    // ── Affiliate performance ─────────────────────────────────────────────
    db.execute(sql`
      SELECT
        u.name,
        ap.affiliate_token                                  AS token,
        COUNT(DISTINCT ac.id)::int                          AS clicks,
        COUNT(DISTINCT o.id)::int                           AS orders,
        COALESCE(SUM(o.affiliate_commission::numeric), 0)::float AS "commissionPaid"
      FROM affiliate_profiles ap
      JOIN users u ON u.id = ap.user_id
      LEFT JOIN affiliate_clicks ac ON ac.affiliate_id = ap.id
        AND ac.product_id IN (
          SELECT id FROM products WHERE vendor_id = ${vendorId}
        )
      LEFT JOIN orders o ON o.affiliate_id = ap.id
        AND o.vendor_id = ${vendorId}
        AND o.payment_status = 'PAID'
      GROUP BY ap.id, u.name, ap.affiliate_token
      HAVING COUNT(DISTINCT ac.id) > 0 OR COUNT(DISTINCT o.id) > 0
      ORDER BY orders DESC
      LIMIT 10
    `),

    // ── Affiliate-driven vs direct conversion ─────────────────────────────
    db.execute(sql`
      SELECT
        COUNT(CASE WHEN affiliate_id IS NOT NULL THEN 1 END)::int     AS "affiliateOrders",
        COUNT(CASE WHEN affiliate_id IS NULL     THEN 1 END)::int     AS "directOrders",
        COALESCE(SUM(CASE WHEN affiliate_id IS NOT NULL AND payment_status = 'PAID'
          THEN total_amount::numeric ELSE 0 END), 0)::float           AS "affiliateRevenue",
        COALESCE(SUM(CASE WHEN affiliate_id IS NULL     AND payment_status = 'PAID'
          THEN total_amount::numeric ELSE 0 END), 0)::float           AS "directRevenue"
      FROM orders
      WHERE vendor_id = ${vendorId}
    `),

    // ── Monthly avg order value ───────────────────────────────────────────
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY')                     AS month,
        AVG(total_amount::numeric)::float                 AS total,
        COUNT(*)::int                                     AS count
      FROM orders
      WHERE vendor_id      = ${vendorId}
        AND payment_status = 'PAID'
        AND created_at    >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `),
  ]);

  const rs  = (revenueStats as any[])[0] ?? {};
  const cv  = (conversionStats as any[])[0] ?? {};

  return {
    shopName,
    totalEarnings:      rs.totalEarnings      ?? 0,
    totalGmv:           rs.totalGmv           ?? 0,
    totalCommissionPaid:rs.totalCommissionPaid ?? 0,
    totalOrders:        rs.totalOrders        ?? 0,
    paidOrders:         rs.paidOrders         ?? 0,
    cancelledOrders:    rs.cancelledOrders    ?? 0,
    avgOrderValue:      rs.avgOrderValue      ?? 0,
    ordersLast30Days:   rs.ordersLast30Days   ?? 0,
    earningsLast30Days: rs.earningsLast30Days ?? 0,
    affiliateOrders:    cv.affiliateOrders    ?? 0,
    directOrders:       cv.directOrders       ?? 0,
    affiliateRevenue:   cv.affiliateRevenue   ?? 0,
    directRevenue:      cv.directRevenue      ?? 0,
    monthlySales: (monthlySales as any[]).map((r) => ({
      month: r.month, total: r.total, count: r.count,
    })),
    avgOrderValueChart: (avgOrderValue as any[]).map((r) => ({
      month: r.month, total: r.total, count: r.count,
    })),
    orderFunnel: (orderFunnel as any[]) as Array<{ status: string; count: number }>,
    topProducts: (topProducts as any[]) as Array<{
      id: string; title: string; imageUrl: string | null;
      price: number; orders: number; earnings: number; avgOrderValue: number;
    }>,
    affiliateStats: (affiliateStats as any[]) as Array<{
      name: string; token: string; clicks: number;
      orders: number; commissionPaid: number;
    }>,
  };
}

// ── Order funnel colours ──────────────────────────────────────────────────────
const FUNNEL_STYLE: Record<string, { bg: string; text: string; bar: string }> = {
  DELIVERED: { bg: 'bg-green-50',  text: 'text-green-700',  bar: 'bg-green-500'  },
  PAID:      { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-500'   },
  CONFIRMED: { bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  SHIPPED:   { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  CREATED:   { bg: 'bg-gray-50',   text: 'text-gray-600',   bar: 'bg-gray-400'   },
  CANCELLED: { bg: 'bg-red-50',    text: 'text-red-700',    bar: 'bg-red-400'    },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function VendorAnalyticsPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getAnalyticsData(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  const {
    shopName, totalEarnings, totalGmv, totalCommissionPaid,
    totalOrders, paidOrders, cancelledOrders, avgOrderValue,
    ordersLast30Days, earningsLast30Days,
    affiliateOrders, directOrders, affiliateRevenue, directRevenue,
    monthlySales, avgOrderValueChart, orderFunnel,
    topProducts, affiliateStats,
  } = data;

  const totalFunnelOrders = orderFunnel.reduce((s, r) => s + r.count, 0);

  return (
    <DashboardShell role="VENDOR" vendorName={shopName}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .va { font-family: 'DM Sans', -apple-system, sans-serif; }
        .va-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .va-sub   { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }
        .va-grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
        .va-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .va-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .va-card  { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .va-card-head { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .va-card-title { font-size: 14px; font-weight: 700; color: #111; letter-spacing: -0.01em; }
        .va-card-body  { padding: 20px; }
        .va-link { font-size: 12.5px; color: #16a34a; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .va-link:hover { text-decoration: underline; }
        .va-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 14px; }
        @media (max-width: 1100px) { .va-grid4 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px)  { .va-grid2, .va-grid3 { grid-template-columns: 1fr; } .va-grid4 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px)  { .va-grid4 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="va">
        <h1 className="va-title">Analytics</h1>
        <p className="va-sub">{shopName} — performance overview</p>

        {/* ── KPI row ── */}
        <div className="va-grid4">
          <StatsCard
            title="Total Earnings"
            value={fmt(totalEarnings)}
            subtitle="All-time vendor earnings"
            icon={<TrendingUp size={18} />}
            color="green"
          />
          <StatsCard
            title="Last 30 Days"
            value={fmt(earningsLast30Days)}
            subtitle={`${ordersLast30Days} orders`}
            icon={<BarChart2 size={18} />}
            color="blue"
          />
          <StatsCard
            title="Avg Order Value"
            value={fmt(avgOrderValue)}
            subtitle="Paid orders"
            icon={<ShoppingCart size={18} />}
            color="amber"
          />
          <StatsCard
            title="Cancellation Rate"
            value={pct(cancelledOrders, totalOrders)}
            subtitle={`${cancelledOrders} of ${totalOrders} orders`}
            icon={<Package size={18} />}
            color="purple"
          />
        </div>

        {/* ── Revenue charts ── */}
        <div className="va-grid2">
          <div className="va-card">
            <div className="va-card-head">
              <span className="va-card-title">Monthly Earnings — Last 12 Months</span>
            </div>
            <div className="va-card-body">
              <SalesChart data={monthlySales} />
            </div>
          </div>

          <div className="va-card">
            <div className="va-card-head">
              <span className="va-card-title">Avg Order Value — Last 6 Months</span>
            </div>
            <div className="va-card-body">
              <SalesChart data={avgOrderValueChart} />
            </div>
          </div>
        </div>

        {/* ── Order funnel + Affiliate vs Direct ── */}
        <div className="va-grid2">

          {/* Order funnel */}
          <div className="va-card">
            <div className="va-card-head">
              <span className="va-card-title">Order Funnel</span>
              <Link href="/vendor/orders" className="va-link">View orders <ArrowUpRight size={12} /></Link>
            </div>
            <div className="va-card-body">
              {orderFunnel.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>No orders yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orderFunnel.map((row) => {
                    const s   = FUNNEL_STYLE[row.status] ?? FUNNEL_STYLE.CREATED;
                    const pct = totalFunnelOrders ? (row.count / totalFunnelOrders) * 100 : 0;
                    return (
                      <div key={row.status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{row.status}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            {row.count} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
                          <div
                            className={s.bar}
                            style={{ height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width 0.4s' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Affiliate vs Direct */}
          <div className="va-card">
            <div className="va-card-head">
              <span className="va-card-title">Affiliate vs Direct Sales</span>
            </div>
            <div className="va-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Affiliate */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16a34a', marginBottom: 4 }}>
                    Affiliate-driven
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.03em' }}>
                    {fmt(affiliateRevenue)}
                  </div>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                    {affiliateOrders} orders · {pct(affiliateOrders, totalOrders)} of total
                  </div>
                </div>

                {/* Direct */}
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 4 }}>
                    Direct sales
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
                    {fmt(directRevenue)}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {directOrders} orders · {pct(directOrders, totalOrders)} of total
                  </div>
                </div>

                {/* Commission paid out */}
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                  Total affiliate commission paid: <strong style={{ color: '#374151' }}>{fmt(totalCommissionPaid)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top products ── */}
        <div className="va-card" style={{ marginBottom: 24 }}>
          <div className="va-card-head">
            <span className="va-card-title">Top Products by Earnings</span>
            <Link href="/vendor/products" className="va-link">All products <ArrowUpRight size={12} /></Link>
          </div>
          <div className="va-card-body" style={{ padding: 0 }}>
            {topProducts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: 20 }}>No sales yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Product', 'Price', 'Orders', 'Earnings', 'Avg Order'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < topProducts.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>}
                          </div>
                          <span style={{ fontWeight: 600, color: '#111', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{fmt(p.price)}</td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{p.orders}</td>
                      <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700 }}>{fmt(p.earnings)}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{fmt(p.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Affiliate leaderboard ── */}
        <div className="va-card">
          <div className="va-card-head">
            <span className="va-card-title">Affiliate Performance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} color="#9ca3af" />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{affiliateStats.length} affiliates</span>
            </div>
          </div>
          <div className="va-card-body" style={{ padding: 0 }}>
            {affiliateStats.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: 20 }}>
                No affiliate activity yet. Share your products with affiliates to get started.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Affiliate', 'Token', 'Clicks', 'Orders', 'Conv.', 'Commission'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affiliateStats.map((a, i) => {
                    const conv = a.clicks ? ((a.orders / a.clicks) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={a.token} style={{ borderBottom: i < affiliateStats.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111' }}>{a.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#374151' }}>
                            {a.token}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#374151' }}>{a.clicks.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{a.orders}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                            background: parseFloat(conv) >= 1 ? '#f0fdf4' : '#fef3c7',
                            color:      parseFloat(conv) >= 1 ? '#16a34a' : '#92400e',
                          }}>
                            {conv}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700 }}>{fmt(a.commissionPaid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
