import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatKES } from '@/lib/utils';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatsCard } from '@/components/dashboard/stats-card';
import { SalesChart } from '@/components/charts/sales-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import {
  DollarSign,
  Users,
  ShoppingBag,
  Store,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

async function getAdminStats() {
  const [
    gmv,
    platformRevenue,
    totalUsers,
    activeVendors,
    activeAffiliates,
    pendingVendors,
    pendingProducts,
    pendingPayouts,
    recentOrders,
    monthlySales,
  ] = await Promise.all([
    // GMV (total paid orders)
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
    // Platform revenue
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { platformRevenue: true },
    }),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.vendorProfile.count({ where: { status: 'approved' } }),
    prisma.affiliateProfile.count({ where: { status: 'active' } }),
    prisma.vendorProfile.count({ where: { status: 'pending' } }),
    prisma.product.count({ where: { status: 'pending_approval' } }),
    prisma.payoutRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.order.findMany({
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT 
        TO_CHAR(created_at, 'Mon YY') as month,
        SUM(total_amount)::float as total,
        COUNT(*)::int as count
      FROM orders
      WHERE payment_status = 'PAID'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `,
  ]);

  return {
    gmv: gmv._sum.totalAmount?.toNumber() || 0,
    platformRevenue: platformRevenue._sum.platformRevenue?.toNumber() || 0,
    totalUsers,
    activeVendors,
    activeAffiliates,
    pendingVendors,
    pendingProducts,
    pendingPayouts,
    recentOrders,
    monthlySales,
  };
}

export default async function AdminDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') redirect('/login');

  const stats = await getAdminStats();

  return (
    <DashboardShell role="ADMIN">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">AffilMarket Kenya Platform Overview</p>
        </div>

        {/* Alerts */}
        {(stats.pendingVendors > 0 || stats.pendingProducts > 0 || stats.pendingPayouts > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.pendingVendors > 0 && (
              <a href="/admin/vendors?status=pending" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">{stats.pendingVendors} vendor{stats.pendingVendors > 1 ? 's' : ''} awaiting approval</p>
                  <p className="text-xs text-amber-600">Click to review</p>
                </div>
              </a>
            )}
            {stats.pendingProducts > 0 && (
              <a href="/admin/products?status=pending_approval" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">{stats.pendingProducts} product{stats.pendingProducts > 1 ? 's' : ''} pending review</p>
                  <p className="text-xs text-blue-600">Click to review</p>
                </div>
              </a>
            )}
            {stats.pendingPayouts > 0 && (
              <a href="/admin/payouts" className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold text-purple-800 text-sm">{stats.pendingPayouts} payout{stats.pendingPayouts > 1 ? 's' : ''} requested</p>
                  <p className="text-xs text-purple-600">Click to process</p>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Stats Grid */}
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

        {/* Sales Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform GMV — Last 6 Months</h2>
          <SalesChart data={stats.monthlySales} />
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
