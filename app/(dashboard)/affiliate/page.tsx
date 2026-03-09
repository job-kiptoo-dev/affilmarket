// "use client"

import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatKES, buildAffiliateLink } from '@/lib/utils';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatsCard } from '@/components/dashboard/stats-card';
import { SalesChart } from '@/components/charts/sales-chart';
import { MousePointer, ShoppingBag, Wallet, TrendingUp } from 'lucide-react';
import { ShareProfileButton } from '@/components/share-profile-button';

async function getAffiliateData(userId: string) {
  const profile = await prisma.affiliateProfile.findUnique({
    where: { userId },
  });
  if (!profile) return null;

  const [clickCount, orderCount, balance, recentCommissions, clicksOverTime] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateId: profile.id } }),
    prisma.order.count({ where: { affiliateId: profile.id, paymentStatus: 'PAID' } }),
    prisma.balance.findUnique({ where: { userId } }),
    prisma.order.findMany({
      where: { affiliateId: profile.id, paymentStatus: 'PAID' },
      include: { product: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    // Clicks over last 6 months
    prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
      SELECT 
        TO_CHAR(created_at, 'Mon YY') as month,
        COUNT(*)::float as total,
        COUNT(*)::int as count
      FROM affiliate_clicks
      WHERE affiliate_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `,
  ]);

  return {
    profile,
    clickCount,
    orderCount,
    balance,
    recentCommissions,
    clicksOverTime,
  };
}

export default async function AffiliateDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getAffiliateData(auth.sub);
  if (!data) redirect('/affiliate/onboarding');

  const conversionRate =
    data.clickCount > 0 ? ((data.orderCount / data.clickCount) * 100).toFixed(1) : '0.0';

  return (
    <DashboardShell role="AFFILIATE">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {data.profile.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Your affiliate performance at a glance</p>
        </div>

        {/* Affiliate Token */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
          <p className="text-amber-100 text-sm font-medium mb-1">Your Affiliate Token</p>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-bold tracking-widest">{data.profile.affiliateToken}</code>


<ShareProfileButton token={data.profile.affiliateToken} />


          </div>
          <p className="text-amber-100 text-xs mt-2">
            Add <code className="bg-white/20 px-1.5 py-0.5 rounded">?aff={data.profile.affiliateToken}</code> to any product URL to track your referrals
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Clicks"
            value={data.clickCount.toLocaleString()}
            icon={<MousePointer className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            title="Referred Orders"
            value={data.orderCount.toString()}
            subtitle={`${conversionRate}% conversion`}
            icon={<ShoppingBag className="w-5 h-5" />}
            color="green"
          />
          <StatsCard
            title="Pending Earnings"
            value={formatKES(data.balance?.pendingBalance?.toNumber() || 0)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="amber"
          />
          <StatsCard
            title="Available Balance"
            value={formatKES(data.balance?.availableBalance?.toNumber() || 0)}
            subtitle="Ready to withdraw"
            icon={<Wallet className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Clicks Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Clicks Last 6 Months</h2>
          <SalesChart data={data.clicksOverTime} />
        </div>

        {/* Recent Commissions */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Commissions</h2>
            <a href="/affiliate/commissions" className="text-sm text-brand-green hover:underline">View all →</a>
          </div>

          {data.recentCommissions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No commissions yet. Start sharing your affiliate links!</p>
              <a
                href="/affiliate/products"
                className="mt-4 inline-block bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Browse Products to Promote
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase pb-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase pb-3">Order Total</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase pb-3">Commission</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentCommissions.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-KE')}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-gray-900 line-clamp-1 max-w-[200px]">
                          {order.product.title}
                        </span>
                      </td>
                      <td className="py-3">{formatKES(order.totalAmount)}</td>
                      <td className="py-3 font-semibold text-amber-600">
                        {formatKES(order.affiliateCommission || 0)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.balancesReleased
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.balancesReleased ? 'Available' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
