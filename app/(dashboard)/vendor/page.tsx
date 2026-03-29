import { redirect }         from 'next/navigation';
import Link                  from 'next/link';
import { getAuthUser }       from '@/lib/healpers/auth-server';
import { db }                from '@/lib/utils/db';
import {
  vendorProfiles, orders as ordersTable, balances,
  products as productsTable,
} from '@/drizzle/schema';
import { eq, desc, gte, and, sql } from 'drizzle-orm';
import { DashboardShell }    from '@/components/dashboard/dashboard-shell';
import { StatsCard }         from '@/components/dashboard/stats-card';
import { SalesChart }        from '@/components/charts/sales-chart';
import { RecentOrders }      from '@/components/dashboard/recent-orders';
import {
  ShoppingCart, Wallet, Package, TrendingUp,
  Plus, Eye, ArrowUpRight,
} from 'lucide-react';

function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

async function getVendorData(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName ,
                isOnboarded: vendorProfiles.isOnboarded,
    })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  // if (!vendor.length) return null;
    if (!vendor.length || !vendor[0].isOnboarded) return null; // ← redirect to onboarding
  const { id: vendorId, shopName } = vendor[0];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [allOrders, balance, recentOrders, productCount, monthlySales] = await Promise.all([
    // all orders for aggregation
    db.select({
      orderStatus:   ordersTable.orderStatus,
      paymentStatus: ordersTable.paymentStatus,
      totalAmount:   ordersTable.totalAmount,
    })
      .from(ordersTable)
      .where(eq(ordersTable.vendorId, vendorId)),

    // balance
    db.select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1),

    // recent orders with product info
    db.select({
      id:            ordersTable.id,
      customerName:  ordersTable.customerName,
      totalAmount:   ordersTable.totalAmount,
      orderStatus:   ordersTable.orderStatus,
      paymentStatus: ordersTable.paymentStatus,
      createdAt:     ordersTable.createdAt,
      productTitle:  productsTable.title,
      productImage:  productsTable.mainImageUrl,
    })
      .from(ordersTable)
      .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
      .where(eq(ordersTable.vendorId, vendorId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),

    // product count
    db.select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(eq(productsTable.vendorId, vendorId)),

    // monthly revenue – raw SQL
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY') AS month,
        SUM(vendor_earnings)::float      AS revenue
      FROM orders
      WHERE vendor_id    = ${vendorId}
        AND payment_status = 'PAID'
        AND created_at   >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),
  ]);

  const paidStatuses = ['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const totalRevenue = allOrders
    .filter((o) => paidStatuses.includes(o.orderStatus))
    .reduce((sum, o) => sum + parseFloat(o.totalAmount ?? '0'), 0);

  const totalOrders   = allOrders.length;
  const pendingOrders = allOrders.filter((o) => o.orderStatus === 'PAID').length;
  const bal           = balance[0];

  return {
    shopName,
    totalRevenue,
    totalOrders,
    pendingOrders,
    productCount:     productCount[0]?.count ?? 0,
    pendingBalance:   parseFloat(bal?.pendingBalance   ?? '0'),
    availableBalance: parseFloat(bal?.availableBalance ?? '0'),
    paidOutTotal:     parseFloat(bal?.paidOutTotal     ?? '0'),
    recentOrders: recentOrders.map((o) => ({
      id:            o.id,
      productTitle:  o.productTitle ?? '',
      productImage:  o.productImage ?? null,
      customerName:  o.customerName,
      totalAmount:   parseFloat(o.totalAmount ?? '0'),
      orderStatus:   o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt:     o.createdAt.toISOString(),
    })),
    monthlySales: (monthlySales as any[]).map((r) => ({
      month:   r.month,
      revenue: r.revenue,
    })),
  };
}

export default async function VendorDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getVendorData(auth.sub);
  if (!data) redirect('/vendor/onboarding/');

  const {
    shopName, totalRevenue, totalOrders, pendingOrders, productCount,
    pendingBalance, availableBalance, paidOutTotal,
    recentOrders, monthlySales,
  } = data;

  return (
    <DashboardShell role="VENDOR" vendorName={shopName}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .vd { font-family: 'DM Sans', -apple-system, sans-serif; }
        .vd-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .vd-sub   { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }
        .vd-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .vd-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .vd-grid2 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .vd-card  { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .vd-card-head { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .vd-card-title { font-size: 14px; font-weight: 700; color: #111; letter-spacing: -0.01em; }
        .vd-card-body  { padding: 20px; }
        .vd-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
        .vd-qa { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px; font-size: 13.5px; font-weight: 600; text-decoration: none; transition: all 0.15s; border: 1px solid #e5e7eb; color: #374151; background: #fff; }
        .vd-qa:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .vd-qa.primary { background: #16a34a; color: #fff; border-color: #16a34a; }
        .vd-qa.primary:hover { background: #15803d; }
        .vd-balance-card { border-radius: 14px; padding: 20px; border: 1px solid #e5e7eb; }
        .vd-balance-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
        .vd-balance-value { font-size: 28px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .vd-link { font-size: 12.5px; color: #16a34a; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .vd-link:hover { text-decoration: underline; }
        .vd-banner { border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        @media (max-width: 1100px) { .vd-grid4 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 768px)  { .vd-grid4, .vd-grid3 { grid-template-columns: 1fr 1fr; } .vd-grid2 { grid-template-columns: 1fr; } }
        @media (max-width: 480px)  { .vd-grid4, .vd-grid3 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="vd">
        <h1 className="vd-title">Good morning, {shopName} 👋</h1>
        <p className="vd-sub">Here's what's happening with your store today.</p>

        {pendingOrders > 0 && (
          <div className="vd-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: 13.5, color: '#92400e', fontWeight: 600 }}>
              📦 You have <strong>{pendingOrders}</strong> order{pendingOrders !== 1 ? 's' : ''} waiting for confirmation.
            </span>
            <Link href="/vendor/orders?status=PAID" className="vd-link">
              View Orders <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {availableBalance > 0 && (
          <div className="vd-banner" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 13.5, color: '#15803d', fontWeight: 600 }}>
              💰 <strong>{fmt(availableBalance)}</strong> is available for withdrawal.
            </span>
            <Link href="/vendor/earnings" className="vd-link">
              Request Payout <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        <div className="vd-quick-actions">
          <Link href="/vendor/products/new" className="vd-qa primary"><Plus size={14} /> Add Product</Link>
          <Link href="/vendor/orders"       className="vd-qa"><ShoppingCart size={14} /> View Orders</Link>
          <Link href="/vendor/earnings"     className="vd-qa"><Wallet size={14} /> Request Payout</Link>
          <Link href="/vendor/analytics"    className="vd-qa"><TrendingUp size={14} /> Analytics</Link>
        </div>

        <div className="vd-grid4">



          <StatsCard title="Total Revenue"    value={fmt(totalRevenue)}    icon={<TrendingUp size={18} />}   color="green"  subtitle="All time" />
          {/* <StatsCard title="Total Orders"     value={totalOrders}          icon={<ShoppingCart size={18} />} color="blue"   subtitle={`${pendingOrders} pending`} /> */}
          <StatsCard
  title="Total Orders"
  value={String(totalOrders)}
  icon={<ShoppingCart size={18} />}
  color="blue"
  subtitle={`${pendingOrders} pending`}
/>
          <StatsCard title="Pending Payout"   value={fmt(pendingBalance)}  icon={<Wallet size={18} />}       color="amber"  subtitle="Processing" />
          {/* <StatsCard title="Products Listed"  value={productCount}         icon={<Package size={18} />}      color="purple" subtitle="Active listings" /> */}
          <StatsCard
  title="Products Listed"
  value={String(productCount)}
  icon={<Package size={18} />}
  color="purple"
  subtitle="Active listings"
/>
        </div>

        <div className="vd-grid3">
          <div className="vd-balance-card" style={{ background: '#111', border: 'none' }}>
            <div className="vd-balance-label" style={{ color: '#6b7280' }}>Pending Balance</div>
            <div className="vd-balance-value" style={{ color: '#fff' }}>{fmt(pendingBalance)}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Waiting for order delivery</div>
          </div>

          <div className="vd-balance-card" style={{
            background: availableBalance > 0 ? '#f0fdf4' : '#f9fafb',
            border:     availableBalance > 0 ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
          }}>
            <div className="vd-balance-label" style={{ color: availableBalance > 0 ? '#16a34a' : '#9ca3af' }}>Available Balance</div>
            <div className="vd-balance-value" style={{ color: availableBalance > 0 ? '#16a34a' : '#374151' }}>{fmt(availableBalance)}</div>
            {availableBalance > 0 ? (
              <Link href="/vendor/earnings" className="vd-link" style={{ marginTop: 8, display: 'inline-flex' }}>
                Withdraw via M-Pesa →
              </Link>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>No funds ready yet</div>
            )}
          </div>

          <div className="vd-balance-card" style={{ background: '#fff' }}>
            <div className="vd-balance-label">Total Paid Out</div>
            <div className="vd-balance-value">{fmt(paidOutTotal)}</div>
            <Link href="/vendor/earnings?tab=history" className="vd-link" style={{ marginTop: 8, display: 'inline-flex' }}>
              View history →
            </Link>
          </div>
        </div>

        <div className="vd-grid2">
          <div className="vd-card">
            <div className="vd-card-head">
              <span className="vd-card-title">Monthly Revenue</span>
              <Link href="/vendor/analytics" className="vd-link"><Eye size={13} /> Full report</Link>
            </div>
            <div className="vd-card-body">
              {/* <SalesChart data={monthlySales.map((m) => ({ name: m.month, value: m.revenue,count:0, }))} /> */}

              <SalesChart
  data={monthlySales.map((m) => ({
    month: m.month,
    total: m.revenue,
    count: 0,
  }))}
/>

            </div>
          </div>

          <div className="vd-card">
            <div className="vd-card-head">
              <span className="vd-card-title">Recent Orders</span>
              <Link href="/vendor/orders" className="vd-link">View all →</Link>
            </div>
            <RecentOrders orders={recentOrders} role="VENDOR"/>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
