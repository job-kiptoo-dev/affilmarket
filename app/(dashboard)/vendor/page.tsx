import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatKES } from '@/lib/utils';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatsCard } from '@/components/dashboard/stats-card';
import { SalesChart } from '@/components/charts/sales-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import {
  ShoppingBag,
  TrendingUp,
  Clock,
  DollarSign,
  Package,
} from 'lucide-react';

async function getVendorDashboardData(userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    include: { _count: { select: { products: true } } },
  });

  if (!vendor) return null;

  const [orders, balance, recentOrders, monthlySales] = await Promise.all([
    prisma.order.groupBy({
      by: ['orderStatus'],
      where: { vendorId: vendor.id },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.balance.findUnique({ where: { userId } }),
    prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: { product: { select: { title: true, mainImageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Last 6 months sales
    prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT 
        TO_CHAR(created_at, 'Mon YY') as month,
        SUM(total_amount)::float as total,
        COUNT(*)::int as count
      FROM orders
      WHERE vendor_id = ${vendor.id}
        AND payment_status = 'PAID'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `,
  ]);

  const totalRevenue = orders
    .filter((o) => ['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(o.orderStatus))
    .reduce((sum, o) => sum + (o._sum.totalAmount?.toNumber() || 0), 0);

  const totalOrders = orders.reduce((sum, o) => sum + o._count, 0);
  const pendingOrders = orders.find((o) => o.orderStatus === 'PAID')?._count || 0;

  return {
    vendor,
    totalRevenue,
    totalOrders,
    pendingOrders,
    productCount: vendor._count.products,
    balance,
    recentOrders,
    monthlySales,
  };
}

export default async function VendorDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    redirect('/login');
  }

  const data = await getVendorDashboardData(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.vendor.shopName}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {data.vendor.shopName} 👋</h1>
          <p className="text-gray-500 mt-1">Here's how your shop is performing</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Revenue"
            value={formatKES(data.totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
          />
          <StatsCard
            title="Total Orders"
            value={data.totalOrders.toString()}
            icon={<ShoppingBag className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            title="Pending Orders"
            value={data.pendingOrders.toString()}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <StatsCard
            title="Active Products"
            value={data.productCount.toString()}
            icon={<Package className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 text-white">
            <p className="text-green-100 text-sm font-medium mb-1">Pending Balance</p>
            <p className="text-3xl font-bold">
              {formatKES(data.balance?.pendingBalance?.toNumber() || 0)}
            </p>
            <p className="text-green-200 text-xs mt-2">Released after delivery confirmation</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm font-medium mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatKES(data.balance?.availableBalance?.toNumber() || 0)}
            </p>
            <p className="text-gray-400 text-xs mt-2">Ready to withdraw via M-Pesa</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm font-medium mb-1">Total Paid Out</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatKES(data.balance?.paidOutTotal?.toNumber() || 0)}
            </p>
            <p className="text-gray-400 text-xs mt-2">Lifetime withdrawals</p>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Last 6 Months</h2>
          <SalesChart data={data.monthlySales} />
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <a href="/vendor/orders" className="text-sm text-brand-green hover:underline">
              View all →
            </a>
          </div>
          <RecentOrders orders={data.recentOrders} role="VENDOR" />
        </div>
      </div>
    </DashboardShell>
  );
}
