import { getAuthUser }       from '@/lib/healpers/auth-server';
import { db }                from '@/lib/utils/db';
import {
  affiliateProfiles, affiliateClicks, orders as ordersTable,
  balances, products as productsTable,
  products,
} from '@/drizzle/schema';
import { and, eq, sql }           from 'drizzle-orm';
import { redirect }          from 'next/navigation';
import { formatKES }         from '@/lib/utils';
import { DashboardShell }    from '@/components/dashboard/dashboard-shell';
import { SalesChart }        from '@/components/charts/sales-chart';
import { ShareProfileButton } from '@/components/share-profile-button';
import {
  MousePointer, ShoppingBag, Wallet, TrendingUp,
  Copy, ExternalLink, ArrowUpRight,
} from 'lucide-react';

async function getAffiliateData(userId: string) {
  const profile = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, userId))
    .limit(1);

  if (!profile.length) return null;
  const aff = profile[0];

  // const [clickCount, orderCount, balance, recentCommissions, clicksOverTime] = await Promise.all([

const [clickCount, orderCount, balance, recentCommissions, clicksOverTime, topProducts] = await Promise.all([


    // click count
    db.select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, aff.id)),

    // paid order count
    db.select({ count: sql<number>`count(*)::int` })
      .from(ordersTable)


      .where(and(
  eq(ordersTable.affiliateId, aff.id),
  eq(ordersTable.paymentStatus, 'PAID')
)),

    // balance
    db.select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .limit(1),

    // recent commissions with product title
    db.select({
      id:                 ordersTable.id,
      createdAt:          ordersTable.createdAt,
      totalAmount:        ordersTable.totalAmount,
      affiliateCommission: ordersTable.affiliateCommission,
      balancesReleased:   ordersTable.balancesReleased,
      productTitle:       productsTable.title,
    })
      .from(ordersTable)
      .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))

      .where(and(
  eq(ordersTable.affiliateId, aff.id),
  eq(ordersTable.paymentStatus, 'PAID')
))

      .orderBy(sql`${ordersTable.createdAt} desc`)
      .limit(10),

    // clicks over time – raw SQL
    db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon YY') AS month,
        COUNT(*)::float               AS total,
        COUNT(*)::int                 AS count
      FROM affiliate_clicks
      WHERE affiliate_id = ${aff.id}
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
      ORDER BY DATE_TRUNC('month', created_at)
    `),
  db.select({
      productId:    affiliateClicks.productId,
      productTitle: productsTable.title,
      productSlug:  productsTable.slug,
      productImage: productsTable.mainImageUrl,
      clicks:       sql<number>`count(*)::int`,
      price:        productsTable.price,
      commRate:     productsTable.affiliateCommissionRate,
    })
      .from(affiliateClicks)
      .leftJoin(productsTable, eq(affiliateClicks.productId, productsTable.id))
      .where(eq(affiliateClicks.affiliateId, aff.id))
      .groupBy(
        affiliateClicks.productId,
        productsTable.title,
        productsTable.slug,
        productsTable.mainImageUrl,
        productsTable.price,
        productsTable.affiliateCommissionRate,
      )
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ]);



  return {
  profile:           aff,
  clickCount:        clickCount[0]?.count ?? 0,
  orderCount:        orderCount[0]?.count ?? 0,
  balance:           balance[0]           ?? null,
  recentCommissions,
  clicksOverTime:    clicksOverTime as any[],
  topProducts:       topProducts ?? [],  // ← ADD THIS
};


  // return {
  //   profile:           aff,
  //   clickCount:        clickCount[0]?.count ?? 0,
  //   orderCount:        orderCount[0]?.count ?? 0,
  //   balance:           balance[0] ?? null,
  //   recentCommissions,
  //   clicksOverTime:    clicksOverTime as any[],
  // };
}

export default async function AffiliateDashboardPage() {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getAffiliateData(auth.sub);
  if (!data) redirect('/affiliate/onboarding');

  const conversionRate =
    data.clickCount > 0 ? ((data.orderCount / data.clickCount) * 100).toFixed(1) : '0.0';

  const pendingBalance   = parseFloat(data.balance?.pendingBalance   ?? '0');
  const availableBalance = parseFloat(data.balance?.availableBalance ?? '0');
  const totalEarned      = data.recentCommissions.reduce(
    (sum, o) => sum + parseFloat(o.affiliateCommission ?? '0'), 0
  );


  const firstName = data.profile.fullName.split(' ')[0];

  return (
    <>
    <DashboardShell role="AFFILIATE" vendorName={ auth.name }>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .aff-page { font-family: 'DM Sans', -apple-system, sans-serif; }
        .aff-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }
        .aff-greeting { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; line-height: 1.1; }
        .aff-subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .aff-header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .aff-btn-outline { display: inline-flex; align-items: center; gap: 7px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 16px; font-size: 13.5px; font-weight: 600; color: #374151; cursor: pointer; text-decoration: none; transition: border-color 0.15s, box-shadow 0.15s; font-family: 'DM Sans', sans-serif; }
        .aff-btn-outline:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .aff-btn-primary { display: inline-flex; align-items: center; gap: 7px; background: #16a34a; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; color: #fff; cursor: pointer; text-decoration: none; transition: background 0.2s; font-family: 'DM Sans', sans-serif; }
        .aff-btn-primary:hover { background: #15803d; }
        .aff-token-card { background: #111; border-radius: 16px; padding: 24px 28px; margin-bottom: 24px; position: relative; overflow: hidden; }
        .aff-token-card::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; border-radius: 50%; background: rgba(22, 163, 74, 0.12); pointer-events: none; }
        .aff-token-card::after { content: ''; position: absolute; bottom: -40px; left: 30%; width: 160px; height: 160px; border-radius: 50%; background: rgba(22, 163, 74, 0.07); pointer-events: none; }
        .aff-token-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
        .aff-token-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .aff-token-code { font-size: 32px; font-weight: 900; color: #fff; letter-spacing: 0.12em; font-family: 'DM Mono', 'Fira Code', monospace; line-height: 1; }
        .aff-token-copy-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif; }
        .aff-token-copy-btn:hover { background: rgba(255,255,255,0.14); }
        .aff-token-hint { font-size: 12.5px; color: #6b7280; margin-top: 12px; position: relative; z-index: 1; }
        .aff-token-hint code { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 2px 7px; font-size: 11.5px; color: #9ca3af; font-family: 'DM Mono', monospace; }
        .aff-token-stats { display: flex; gap: 0; border-top: 1px solid rgba(255,255,255,0.07); margin-top: 20px; padding-top: 18px; position: relative; z-index: 1; }
        .aff-token-stat { flex: 1; padding: 0 20px; border-right: 1px solid rgba(255,255,255,0.07); }
        .aff-token-stat:first-child { padding-left: 0; }
        .aff-token-stat:last-child { border-right: none; }
        .aff-token-stat-value { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1.1; }
        .aff-token-stat-label { font-size: 12px; color: #6b7280; margin-top: 3px; }
        .aff-token-stat-value.green { color: #4ade80; }
        .aff-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .aff-stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px 22px; transition: box-shadow 0.2s, transform 0.2s; }
        .aff-stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .aff-stat-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .aff-stat-label-text { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
        .aff-stat-value-text { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 6px; }
        .aff-stat-sub-text { font-size: 12px; color: #9ca3af; font-weight: 500; display: flex; align-items: center; gap: 4px; }
        .aff-stat-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; border-radius: 100px; padding: 2px 7px; }
        .aff-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px 24px; margin-bottom: 20px; }
        .aff-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .aff-card-title { font-size: 15px; font-weight: 700; color: #111; letter-spacing: -0.02em; }
        .aff-card-subtitle { font-size: 12.5px; color: #9ca3af; margin-top: 2px; }
        .aff-view-all { font-size: 13px; font-weight: 600; color: #16a34a; text-decoration: none; display: flex; align-items: center; gap: 4px; transition: opacity 0.15s; }
        .aff-view-all:hover { opacity: 0.75; }
        .aff-table { width: 100%; border-collapse: collapse; }
        .aff-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 0 12px 12px; border-bottom: 1px solid #f3f4f6; }
        .aff-table th:first-child { padding-left: 0; }
        .aff-table td { padding: 13px 12px; font-size: 13.5px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .aff-table td:first-child { padding-left: 0; }
        .aff-table tr:last-child td { border-bottom: none; }
        .aff-table tr:hover td { background: #fafafa; }
        .aff-product-title { font-weight: 600; color: #111; font-size: 13.5px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .aff-commission-amount { font-weight: 700; color: #16a34a; font-size: 14px; }
        .aff-order-total { font-weight: 600; color: #374151; }
        .aff-status-pill { display: inline-flex; align-items: center; gap: 5px; border-radius: 100px; padding: 3px 10px; font-size: 11.5px; font-weight: 700; }
        .aff-status-dot { width: 5px; height: 5px; border-radius: 50%; }
        .aff-date-text { font-size: 12px; color: #9ca3af; white-space: nowrap; }
        .aff-empty { text-align: center; padding: 52px 20px; }
        .aff-empty-icon { width: 60px; height: 60px; border-radius: 16px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 16px; }
        .aff-empty-title { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .aff-empty-desc { font-size: 14px; color: #9ca3af; margin-bottom: 20px; }
        .aff-payout-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .aff-payout-banner-icon { width: 42px; height: 42px; border-radius: 10px; background: #dcfce7; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .aff-payout-banner-text { flex: 1; min-width: 0; }
        .aff-payout-banner-title { font-size: 14px; font-weight: 700; color: #15803d; }
        .aff-payout-banner-desc { font-size: 13px; color: #16a34a; margin-top: 2px; }
        @media (max-width: 1024px) { .aff-stats-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) { .aff-stats-grid { grid-template-columns: 1fr; } .aff-token-stats { flex-direction: column; gap: 14px; } .aff-token-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); padding: 0 0 14px; } .aff-token-stat:last-child { border-bottom: none; padding-bottom: 0; } .aff-token-code { font-size: 24px; } .aff-greeting { font-size: 22px; } .aff-header { flex-direction: column; } }
      `}</style>

      <div className="aff-page">

        <div className="aff-header">
          <div>
            <h1 className="aff-greeting">Hey, {firstName} 👋</h1>
            <p className="aff-subtitle">Your affiliate performance at a glance</p>
          </div>
          <div className="aff-header-actions">
            <a href="/affiliate/products" className="aff-btn-outline">
              <ExternalLink size={14} /> Browse Products
            </a>
            <a href="/affiliate/payouts" className="aff-btn-primary">💳 Request Payout</a>
          </div>
        </div>

        {availableBalance > 0 && (
          <div className="aff-payout-banner">
            <div className="aff-payout-banner-icon">💰</div>
            <div className="aff-payout-banner-text">
              <div className="aff-payout-banner-title">{formatKES(availableBalance)} is ready to withdraw!</div>
              <div className="aff-payout-banner-desc">Funds are released and available — withdraw to M-Pesa or bank now.</div>
            </div>
            <a href="/affiliate/payouts" className="aff-btn-primary" style={{ flexShrink: 0 }}>Withdraw Now →</a>
          </div>
        )}

        <div className="aff-token-card">
          <div className="aff-token-label" style={{ position: 'relative', zIndex: 1 }}>Your Affiliate Token</div>
          <div className="aff-token-row" style={{ position: 'relative', zIndex: 1 }}>
            <code className="aff-token-code">{data.profile.affiliateToken}</code>
            <ShareProfileButton token={data.profile.affiliateToken} />
            <button className="aff-token-copy-btn"><Copy size={13} /> Copy Token</button>
          </div>
          <p className="aff-token-hint">
            Add <code>?aff={data.profile.affiliateToken}</code> to any product URL to track your referrals
          </p>
          <div className="aff-token-stats">
            <div className="aff-token-stat">
              <div className="aff-token-stat-value">{data.clickCount.toLocaleString()}</div>
              <div className="aff-token-stat-label">Total Clicks</div>
            </div>
            <div className="aff-token-stat">
              <div className="aff-token-stat-value">{data.orderCount}</div>
              <div className="aff-token-stat-label">Referred Orders</div>
            </div>
            <div className="aff-token-stat">
              <div className="aff-token-stat-value">{conversionRate}%</div>
              <div className="aff-token-stat-label">Conversion Rate</div>
            </div>
            <div className="aff-token-stat">
              <div className="aff-token-stat-value green">{formatKES(totalEarned)}</div>
              <div className="aff-token-stat-label">Total Earned</div>
            </div>
          </div>
        </div>

        {/* Top Products by Clicks */}
<div className="aff-card" style={{ marginBottom: 20 }}>
  <div className="aff-card-header">
    <div>
      <div className="aff-card-title">Top Products by Clicks</div>
      <div className="aff-card-subtitle">Your most visited affiliate links</div>
    </div>
  </div>

  {data.topProducts.length === 0 ? (

    <div className="aff-empty">
      <div className="aff-empty-icon">📊</div>
      <div className="aff-empty-title">No clicks yet</div>
      <div className="aff-empty-desc">Share your affiliate links to start tracking.</div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.topProducts.map((p, i) => {
        const commEarn = (parseFloat(p.price ?? '0') * parseFloat(p.commRate ?? '0')).toFixed(0);
        return (
          <div key={p.productId} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 0',
            borderBottom: i < data.topProducts.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            {/* Rank */}
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: i === 0 ? '#fef9c3' : '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800,
              color: i === 0 ? '#d97706' : '#6b7280',
              flexShrink: 0,
            }}>
              {i + 1}
            </div>

            {/* Image */}
            <div style={{
              width: 44, height: 44, borderRadius: 8,
              background: '#f3f4f6', overflow: 'hidden',
              border: '1px solid #e5e7eb', flexShrink: 0,
            }}>
              {p.productImage
                ? <img src={p.productImage} alt={p.productTitle ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛍️</div>}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.productTitle}
              </div>
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                +KES {commEarn} per sale
              </div>
            </div>

            {/* Clicks */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
                {p.clicks.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>clicks</div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>


        <div className="aff-stats-grid">
          <div className="aff-stat-card">
            <div className="aff-stat-icon-wrap" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <MousePointer size={17} style={{ color: '#2563eb' }} />
            </div>
            <div className="aff-stat-label-text">Total Clicks</div>
            <div className="aff-stat-value-text">{data.clickCount.toLocaleString()}</div>
            <div className="aff-stat-sub-text">
              <span className="aff-stat-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <ArrowUpRight size={10} /> All time
              </span>
            </div>
          </div>

          <div className="aff-stat-card">
            <div className="aff-stat-icon-wrap" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <ShoppingBag size={17} style={{ color: '#16a34a' }} />
            </div>
            <div className="aff-stat-label-text">Referred Orders</div>
            <div className="aff-stat-value-text">{data.orderCount}</div>
            <div className="aff-stat-sub-text">
              <span className="aff-stat-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                {conversionRate}% conversion
              </span>
            </div>
          </div>

          <div className="aff-stat-card">
            <div className="aff-stat-icon-wrap" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <TrendingUp size={17} style={{ color: '#d97706' }} />
            </div>
            <div className="aff-stat-label-text">Pending Earnings</div>
            <div className="aff-stat-value-text">{formatKES(pendingBalance)}</div>
            <div className="aff-stat-sub-text" style={{ color: '#d97706' }}>⏳ Releasing after delivery</div>
          </div>

          <div className="aff-stat-card" style={{
            border:     availableBalance > 0 ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
            background: availableBalance > 0 ? '#f0fdf4' : '#fff',
          }}>
            <div className="aff-stat-icon-wrap" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <Wallet size={17} style={{ color: '#7c3aed' }} />
            </div>
            <div className="aff-stat-label-text">Available Balance</div>
            <div className="aff-stat-value-text" style={{ color: availableBalance > 0 ? '#16a34a' : '#111' }}>
              {formatKES(availableBalance)}
            </div>
            <div className="aff-stat-sub-text">
              {availableBalance > 0
                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Ready to withdraw</span>
                : <span>Waiting for orders</span>}
            </div>
          </div>
        </div>

        <div className="aff-card">
          <div className="aff-card-header">
            <div>
              <div className="aff-card-title">Click Analytics</div>
              <div className="aff-card-subtitle">Clicks over the last 6 months</div>
            </div>
            <a href="/affiliate/analytics" className="aff-view-all">Full report <ArrowUpRight size={13} /></a>
          </div>

          <SalesChart
  data={data.clicksOverTime.map((r) => ({
    month: r.month,
    total: r.total,
    count: 0,
  }))}
/>

          {/* <SalesChart data={data.clicksOverTime.map((r) => ({ name: r.month, value: r.total, count:0 }))} /> */}
        </div>

        <div className="aff-card" style={{ marginBottom: 0 }}>
          <div className="aff-card-header">
            <div>
              <div className="aff-card-title">Recent Commissions</div>
              <div className="aff-card-subtitle">Your latest referred sales</div>
            </div>
            <a href="/affiliate/commissions" className="aff-view-all">View all <ArrowUpRight size={13} /></a>
          </div>

          {data.recentCommissions.length === 0 ? (
            <div className="aff-empty">
              <div className="aff-empty-icon">🔗</div>
              <div className="aff-empty-title">No commissions yet</div>
              <div className="aff-empty-desc">Start sharing your affiliate links to earn commissions on every sale.</div>
              <a href="/affiliate/products" className="aff-btn-primary" style={{ display: 'inline-flex' }}>
                Browse Products to Promote →
              </a>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="aff-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Order Total</th>
                    <th>Your Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCommissions.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="aff-date-text">
                          {new Date(order.createdAt).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td><span className="aff-product-title">{order.productTitle ?? '—'}</span></td>
                      <td><span className="aff-order-total">{formatKES(parseFloat(order.totalAmount ?? '0'))}</span></td>
                      <td>
                        <span className="aff-commission-amount">
                          +{formatKES(parseFloat(order.affiliateCommission ?? '0'))}
                        </span>
                      </td>
                      <td>
                        {order.balancesReleased ? (
                          <span className="aff-status-pill" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            <span className="aff-status-dot" style={{ background: '#16a34a' }} /> Available
                          </span>
                        ) : (
                          <span className="aff-status-pill" style={{ background: '#fffbeb', color: '#d97706' }}>
                            <span className="aff-status-dot" style={{ background: '#d97706' }} /> Pending
                          </span>
                        )}
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
</>
  );
}
