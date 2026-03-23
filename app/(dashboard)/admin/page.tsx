import { db }          from '@/lib/utils/db';
import {
  orders as ordersTable, users, vendorProfiles,
  affiliateProfiles, products, payoutRequests, categories,
} from '@/drizzle/schema';
import { eq, sql, desc, and, lt, gt } from 'drizzle-orm';
import { redirect }     from 'next/navigation';
import { formatKES }    from '@/lib/utils';
import { getAuthUser }  from '@/lib/healpers/auth-server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatsCard }      from '@/components/dashboard/stats-card';
import { SalesChart }     from '@/components/charts/sales-chart';
import { RecentOrders }   from '@/components/dashboard/recent-orders';
import { WarningFlagsPanel } from '@/components/admin/warning-flags-panel';
import {
  DollarSign, Users, Store, TrendingUp, AlertCircle,
} from 'lucide-react';

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function getAdminStats() {
  const [
    gmvResult,
    platformRevenueResult,
    totalUsers,
    activeVendors,
    activeAffiliates,
    pendingVendors,
    pendingProducts,
    pendingPayouts,
    recentOrders,
    monthlySales,
  ] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)::float` })
      .from(ordersTable).where(eq(ordersTable.paymentStatus, 'PAID')),

    db.select({ total: sql<number>`coalesce(sum(platform_revenue::numeric), 0)::float` })
      .from(ordersTable).where(eq(ordersTable.paymentStatus, 'PAID')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(users).where(eq(users.status, 'active')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(vendorProfiles).where(eq(vendorProfiles.status, 'approved')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(affiliateProfiles).where(eq(affiliateProfiles.status, 'active')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(vendorProfiles).where(eq(vendorProfiles.status, 'pending')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(products).where(eq(products.status, 'pending_approval')),

    db.select({ count: sql<number>`count(*)::int` })
      .from(payoutRequests).where(eq(payoutRequests.status, 'REQUESTED')),

    db.select({
      id:            ordersTable.id,
      customerName:  ordersTable.customerName,
      totalAmount:   ordersTable.totalAmount,
      orderStatus:   ordersTable.orderStatus,
      paymentStatus: ordersTable.paymentStatus,
      createdAt:     ordersTable.createdAt,
      productTitle:  products.title,
      productImage:  products.mainImageUrl,
    })
      .from(ordersTable)
      .leftJoin(products, eq(ordersTable.productId, products.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),

    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY') AS month,
        SUM(total_amount::numeric)::float AS total,
        COUNT(*)::int AS count
      FROM orders
      WHERE payment_status = 'PAID'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `),
  ]);

  return {
    gmv:              gmvResult[0]?.total              ?? 0,
    platformRevenue:  platformRevenueResult[0]?.total  ?? 0,
    totalUsers:       totalUsers[0]?.count             ?? 0,
    activeVendors:    activeVendors[0]?.count          ?? 0,
    activeAffiliates: activeAffiliates[0]?.count       ?? 0,
    pendingVendors:   pendingVendors[0]?.count         ?? 0,
    pendingProducts:  pendingProducts[0]?.count        ?? 0,
    pendingPayouts:   pendingPayouts[0]?.count         ?? 0,
    recentOrders:     recentOrders.map((o) => ({
      id:            o.id,
      productTitle:  o.productTitle  ?? '',
      productImage:  o.productImage  ?? null,
      customerName:  o.customerName,
      totalAmount:   parseFloat(o.totalAmount ?? '0'),
      orderStatus:   o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt:     o.createdAt.toISOString(),
    })),
    monthlySales: (monthlySales as any[]).map((r) => ({
      month:   r.month,
      revenue: r.total,
    })),
  };
}

// ─── Drop-in replacement for the two flag functions in app/admin/page.tsx ────
// Uses affiliateClicks + orders tables via subqueries instead of stored columns.

/** Vendors where >30% of orders (min 5) are CANCELLED */
export async function getFlaggedVendors() {
  const rows = await db.execute(sql`
    SELECT
      vp.id,
      vp.shop_name                 AS "shopName",
      vp.status,
      COUNT(o.id)::int             AS "totalOrders",
      SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END)::int
                                   AS "cancelledOrders"
    FROM vendor_profiles vp
    LEFT JOIN orders o ON o.vendor_id = vp.id
    WHERE vp.status = 'approved'
    GROUP BY vp.id, vp.shop_name, vp.status
    HAVING COUNT(o.id) >= 5
       AND (
         SUM(CASE WHEN o.order_status = 'CANCELLED' THEN 1 ELSE 0 END)::float
         / NULLIF(COUNT(o.id), 0)
       ) > 0.30
    ORDER BY "cancelledOrders" DESC
    LIMIT 20
  `);
  return rows as Array<{
    id: string; shopName: string; status: string;
    totalOrders: number; cancelledOrders: number;
  }>;
}

/**
 * Affiliates with 200+ clicks but <0.5% conversion.
 * Clicks come from affiliate_clicks table; orders counted from orders table.
 */
export async function getFlaggedAffiliates() {
  const rows = await db.execute(sql`
    SELECT
      ap.id,
      u.name,
      u.email,
      ap.status,
      COUNT(DISTINCT ac.id)::int   AS "totalClicks",
      COUNT(DISTINCT o.id)::int    AS "totalOrders"
    FROM affiliate_profiles ap
    JOIN users u ON u.id = ap.user_id
    LEFT JOIN affiliate_clicks ac ON ac.affiliate_id = ap.id
    LEFT JOIN orders o            ON o.affiliate_id  = ap.id
    WHERE ap.status = 'active'
    GROUP BY ap.id, u.name, u.email, ap.status
    HAVING COUNT(DISTINCT ac.id) >= 200
       AND (
         COUNT(DISTINCT o.id)::float
         / NULLIF(COUNT(DISTINCT ac.id), 0)
       ) < 0.005
    ORDER BY "totalClicks" DESC
    LIMIT 20
  `);
  return rows as Array<{
    id: string; name: string; email: string; status: string;
    totalClicks: number; totalOrders: number;
  }>;
}






// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') redirect('/login');

  const [stats, flaggedVendors, flaggedAffiliates] = await Promise.all([
    getAdminStats(),
    getFlaggedVendors(),
    getFlaggedAffiliates(),
  ]);

  return (
    <DashboardShell role="ADMIN" vendorName={ auth.name }>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">AffilMarket Kenya — Platform Overview</p>
        </div>

        {/* Action Alerts */}
        {(stats.pendingVendors > 0 || stats.pendingProducts > 0 || stats.pendingPayouts > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.pendingVendors > 0 && (
              <a href="/admin/users?tab=vendors&status=pending"
                className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">
                    {stats.pendingVendors} vendor{stats.pendingVendors > 1 ? 's' : ''} awaiting approval
                  </p>
                  <p className="text-xs text-amber-600">Click to review</p>
                </div>
              </a>
            )}
            {stats.pendingProducts > 0 && (
              <a href="/admin/products?status=pending_approval"
                className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">
                    {stats.pendingProducts} product{stats.pendingProducts > 1 ? 's' : ''} pending review
                  </p>
                  <p className="text-xs text-blue-600">Click to review</p>
                </div>
              </a>
            )}
            {stats.pendingPayouts > 0 && (
              <a href="/admin/payouts"
                className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-semibold text-purple-800 text-sm">
                    {stats.pendingPayouts} payout{stats.pendingPayouts > 1 ? 's' : ''} requested
                  </p>
                  <p className="text-xs text-purple-600">Click to process</p>
                </div>
              </a>
            )}
          </div>
        )}

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total GMV"
            value={formatKES(stats.gmv)}
            subtitle="All-time paid orders"
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
          />
          <StatsCard
            title="Platform Revenue"
            value={formatKES(stats.platformRevenue)}
            subtitle="Fees collected"
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            title="Active Vendors"
            value={stats.activeVendors.toString()}
            icon={<Store className="w-5 h-5" />}
            color="amber"
          />
          <StatsCard
            title="Active Users"
            value={stats.totalUsers.toString()}
            subtitle={`${stats.activeAffiliates} affiliates`}
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Warning Flags */}
        <WarningFlagsPanel
          flaggedVendors={flaggedVendors}
          flaggedAffiliates={flaggedAffiliates}
        />

        {/* Sales Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Platform GMV — Last 6 Months
          </h2>
          <SalesChart data={stats.monthlySales.map((m) => ({ name: m.month, value: m.revenue }))} />
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <a href="/admin/orders" className="text-sm text-brand-green hover:underline">View all →</a>
          </div>
          <RecentOrders orders={stats.recentOrders} role="ADMIN" />
        </div>
      </div>
    </DashboardShell>
  );
}


// import { getAuthUser }    from '@/lib/healpers/auth-server';
// import { db }             from '@/lib/utils/db';
// import {
//   orders as ordersTable, users, vendorProfiles,
//   affiliateProfiles, products, payoutRequests,
//   categories,
// } from '@/drizzle/schema';
// import { eq, sql, gte, desc, and }   from 'drizzle-orm';
// import { redirect }       from 'next/navigation';
// import { formatKES }      from '@/lib/utils';
// import { DashboardShell } from '@/components/dashboard/dashboard-shell';
// import { StatsCard }      from '@/components/dashboard/stats-card';
// import { SalesChart }     from '@/components/charts/sales-chart';
// import { RecentOrders }   from '@/components/dashboard/recent-orders';
// import { DollarSign, Users, ShoppingBag, Store, AlertCircle, TrendingUp } from 'lucide-react';
// import { getAuthUser } from '@/lib/healpers/auth-server';
//
// // import { db }             from '@/lib/db';
// // import { products, vendorProfiles, categories } from '@/drizzle/schema';
// // import { eq, desc, and } from 'drizzle-orm';
// // import { redirect }       from 'next/navigation';
// // import { DashboardShell } from '@/components/dashboard/dashboard-shell';
// import { AdminProductsClient } from '@/components/admin/admin-products-client';
//
// async function getProducts(status?: string) {
//   const conditions = status ? [eq(products.status, status as any)] : [];
//
//   return db
//     .select({
//       id:                     products.id,
//       title:                  products.title,
//       slug:                   products.slug,
//       price:                  products.price,
//       status:                 products.status,
//       mainImageUrl:           products.mainImageUrl,
//       shortDescription:       products.shortDescription,
//       affiliateCommissionRate: products.affiliateCommissionRate,
//       adminNote:              products.adminNote,
//       createdAt:              products.createdAt,
//       shopName:               vendorProfiles.shopName,
//       categoryName:           categories.name,
//     })
//     .from(products)
//     .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
//     .leftJoin(categories,     eq(products.categoryId, categories.id))
//     .where(conditions.length ? and(...conditions) : undefined)
//     .orderBy(desc(products.createdAt))
//     .limit(100);
// }
//
// export default async function AdminProductsPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ status?: string }>;
// }) {
//   const auth = await getAuthUser();
//   if (!auth || auth.role !== 'ADMIN') redirect('/login');
//
//   const params  = await searchParams;
//   const status  = params.status ?? 'pending_approval';
//   const prods   = await getProducts(status);
//
//   const counts = await Promise.all([
//     db.select({ count: products.id }).from(products).where(eq(products.status, 'pending_approval')),
//     db.select({ count: products.id }).from(products).where(eq(products.status, 'active')),
//     db.select({ count: products.id }).from(products).where(eq(products.status, 'rejected')),
//   ]);
//
//   return (
//     <DashboardShell role="ADMIN">
//       <AdminProductsClient
//         products={prods.map((p) => ({
//           ...p,
//           price:                  parseFloat(p.price),
//           affiliateCommissionRate: parseFloat(p.affiliateCommissionRate),
//           mainImageUrl:           p.mainImageUrl ?? null,
//           shortDescription:       p.shortDescription ?? null,
//           shopName:               p.shopName ?? '',
//           categoryName:           p.categoryName ?? null,
//           adminNote:              p.adminNote ?? null,
//           createdAt:              p.createdAt.toISOString(),
//         }))}
//         activeTab={status}
//         counts={{
//           pending:  counts[0].length,
//           active:   counts[1].length,
//           rejected: counts[2].length,
//         }}
//       />
//     </DashboardShell>
//   );
// }
//
// async function getAdminStats() {
//   const sixMonthsAgo = new Date();
//   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
//
//   const [
//     gmvResult,
//     platformRevenueResult,
//     totalUsers,
//     activeVendors,
//     activeAffiliates,
//     pendingVendors,
//     pendingProducts,
//     pendingPayouts,
//     recentOrders,
//     monthlySales,
//   ] = await Promise.all([
//     // GMV
//     db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)::float` })
//       .from(ordersTable)
//       .where(eq(ordersTable.paymentStatus, 'PAID')),
//
//     // Platform revenue
//     db.select({ total: sql<number>`coalesce(sum(platform_revenue::numeric), 0)::float` })
//       .from(ordersTable)
//       .where(eq(ordersTable.paymentStatus, 'PAID')),
//
//     // Total active users
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(users)
//       .where(eq(users.status, 'active')),
//
//     // Active vendors
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(vendorProfiles)
//       .where(eq(vendorProfiles.status, 'approved')),
//
//     // Active affiliates
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(affiliateProfiles)
//       .where(eq(affiliateProfiles.status, 'active')),
//
//     // Pending vendors
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(vendorProfiles)
//       .where(eq(vendorProfiles.status, 'pending')),
//
//     // Pending products
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(products)
//       .where(eq(products.status, 'pending_approval')),
//
//     // Pending payouts
//     db.select({ count: sql<number>`count(*)::int` })
//       .from(payoutRequests)
//       .where(eq(payoutRequests.status, 'REQUESTED')),
//
//     // Recent orders
//     db.select({
//       id:            ordersTable.id,
//       customerName:  ordersTable.customerName,
//       totalAmount:   ordersTable.totalAmount,
//       orderStatus:   ordersTable.orderStatus,
//       paymentStatus: ordersTable.paymentStatus,
//       createdAt:     ordersTable.createdAt,
//       productTitle:  products.title,
//       productImage:  products.mainImageUrl,
//     })
//       .from(ordersTable)
//       .leftJoin(products, eq(ordersTable.productId, products.id))
//       .orderBy(sql`${ordersTable.createdAt} desc`)
//       .limit(10),
//
//     // Monthly GMV
//     db.execute(sql`
//       SELECT
//         TO_CHAR(created_at, 'Mon YY') AS month,
//         SUM(total_amount::numeric)::float AS total,
//         COUNT(*)::int AS count
//       FROM orders
//       WHERE payment_status = 'PAID'
//         AND created_at >= NOW() - INTERVAL '6 months'
//       GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
//       ORDER BY DATE_TRUNC('month', created_at)
//     `),
//   ]);
//
//   return {
//     gmv:              gmvResult[0]?.total              ?? 0,
//     platformRevenue:  platformRevenueResult[0]?.total  ?? 0,
//     totalUsers:       totalUsers[0]?.count             ?? 0,
//     activeVendors:    activeVendors[0]?.count          ?? 0,
//     activeAffiliates: activeAffiliates[0]?.count       ?? 0,
//     pendingVendors:   pendingVendors[0]?.count         ?? 0,
//     pendingProducts:  pendingProducts[0]?.count        ?? 0,
//     pendingPayouts:   pendingPayouts[0]?.count         ?? 0,
//     recentOrders:     recentOrders.map((o) => ({
//       id:            o.id,
//       productTitle:  o.productTitle  ?? '',
//       productImage:  o.productImage  ?? null,
//       customerName:  o.customerName,
//       totalAmount:   parseFloat(o.totalAmount ?? '0'),
//       orderStatus:   o.orderStatus,
//       paymentStatus: o.paymentStatus,
//       createdAt:     o.createdAt.toISOString(),
//     })),
//     monthlySales: (monthlySales as any[]).map((r) => ({
//       month:   r.month,
//       revenue: r.total,
//     })),
//   };
// }
//
// export default async function AdminDashboardPage() {
//   const auth = await getAuthUser();
//   if (!auth || auth.role !== 'ADMIN') redirect('/login');
//
//   const stats = await getAdminStats();
//
//   return (
//     <DashboardShell role="ADMIN">
//       <div className="space-y-8">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
//           <p className="text-gray-500 mt-1">AffilMarket Kenya Platform Overview</p>
//         </div>
//
//         {/* Alerts */}
//         {(stats.pendingVendors > 0 || stats.pendingProducts > 0 || stats.pendingPayouts > 0) && (
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             {stats.pendingVendors > 0 && (
//               <a href="/admin/vendors?status=pending" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
//                 <AlertCircle className="w-5 h-5 text-amber-600" />
//                 <div>
//                   <p className="font-semibold text-amber-800 text-sm">{stats.pendingVendors} vendor{stats.pendingVendors > 1 ? 's' : ''} awaiting approval</p>
//                   <p className="text-xs text-amber-600">Click to review</p>
//                 </div>
//               </a>
//             )}
//             {stats.pendingProducts > 0 && (
//               <a href="/admin/products?status=pending_approval" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
//                 <AlertCircle className="w-5 h-5 text-blue-600" />
//                 <div>
//                   <p className="font-semibold text-blue-800 text-sm">{stats.pendingProducts} product{stats.pendingProducts > 1 ? 's' : ''} pending review</p>
//                   <p className="text-xs text-blue-600">Click to review</p>
//                 </div>
//               </a>
//             )}
//             {stats.pendingPayouts > 0 && (
//               <a href="/admin/payouts" className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors">
//                 <AlertCircle className="w-5 h-5 text-purple-600" />
//                 <div>
//                   <p className="font-semibold text-purple-800 text-sm">{stats.pendingPayouts} payout{stats.pendingPayouts > 1 ? 's' : ''} requested</p>
//                   <p className="text-xs text-purple-600">Click to process</p>
//                 </div>
//               </a>
//             )}
//           </div>
//         )}
//
//         {/* Stats Grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//           <StatsCard
//             title="Total GMV"
//             value={formatKES(stats.gmv)}
//             subtitle="All-time paid orders"
//             icon={<TrendingUp className="w-5 h-5" />}
//             color="green"
//           />
//           <StatsCard
//             title="Platform Revenue"
//             value={formatKES(stats.platformRevenue)}
//             subtitle="Fees collected"
//             icon={<DollarSign className="w-5 h-5" />}
//             color="blue"
//           />
//           <StatsCard
//             title="Active Vendors"
//             value={stats.activeVendors.toString()}
//             icon={<Store className="w-5 h-5" />}
//             color="amber"
//           />
//           <StatsCard
//             title="Active Users"
//             value={stats.totalUsers.toString()}
//             subtitle={`${stats.activeAffiliates} affiliates`}
//             icon={<Users className="w-5 h-5" />}
//             color="purple"
//           />
//         </div>
//
//         {/* Sales Chart */}
//         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
//           <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform GMV — Last 6 Months</h2>
//           <SalesChart data={stats.monthlySales.map((m) => ({ name: m.month, value: m.revenue }))} />
//         </div>
//
//         {/* Recent Orders */}
//         <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
//             <a href="/admin/orders" className="text-sm text-brand-green hover:underline">View all →</a>
//           </div>
//           <RecentOrders orders={stats.recentOrders} role="ADMIN" />
//         </div>
//       </div>
//     </DashboardShell>
//   );
// }
