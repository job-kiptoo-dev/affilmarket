import { unstable_noStore as noStore } from 'next/cache';
import { redirect }                    from 'next/navigation';
import { getAuthUser }                 from '@/lib/healpers/auth-server';
import { db }                          from '@/lib/utils/db';
import {
  affiliateProfiles, affiliateClicks,
  orders as ordersTable, products as productsTable,
} from '@/drizzle/schema';
import { eq, sql }                     from 'drizzle-orm';
import { DashboardShell }              from '@/components/dashboard/dashboard-shell';
import { AffiliateAnalyticsClient }   from '@/components/affiliate/affiliate-analytics-client';

async function getAnalyticsData(userId: string) {
  const profile = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, userId))
    .limit(1);

  if (!profile.length) return null;
  const { id: affiliateId, fullName } = profile[0];

  const [
    clicksPerDay,
    clicksPerHour,
    clicksPerDayOfWeek,
    ordersPerDay,
    monthlyTrends,
    productPerformance,
    cityBreakdown,
    referrerBreakdown,
    summaryStats,
    recentClicks,
  ] = await Promise.all([

    // clicks per day last 30 days
    db.execute(sql`
      SELECT
        DATE(created_at)  AS day,
        COUNT(*)::int     AS clicks
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `),

    // clicks by hour of day (0-23)
    db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)::int                       AS clicks
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `),

    // clicks by day of week (0=Sun ... 6=Sat)
    db.execute(sql`
      SELECT
        EXTRACT(DOW FROM created_at)::int AS dow,
        COUNT(*)::int                      AS clicks
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(DOW FROM created_at)
      ORDER BY dow
    `),

    // orders + commissions per day last 30 days
    db.execute(sql`
      SELECT
        DATE(created_at)               AS day,
        COUNT(*)::int                  AS orders,
        COALESCE(SUM(affiliate_commission)::float, 0) AS commission
      FROM orders
      WHERE affiliate_id   = ${affiliateId}
        AND payment_status = 'PAID'
        AND created_at    >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `),

    // monthly trends last 6 months
    //


    // monthly trends last 6 months
db.execute(sql`
  SELECT
    TO_CHAR(month, 'Mon YY') AS label,
    SUM(clicks)      AS clicks,
    SUM(orders)      AS orders,
    SUM(commission)  AS commission
  FROM (
    SELECT
      DATE_TRUNC('month', created_at) AS month,
      COUNT(*)::int                   AS clicks,
      0::int                          AS orders,
      0::float                        AS commission
    FROM affiliate_clicks
    WHERE affiliate_id = ${affiliateId}
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)

    UNION ALL

    SELECT
      DATE_TRUNC('month', created_at) AS month,
      0::int                          AS clicks,
      COUNT(*)::int                   AS orders,
      COALESCE(SUM(affiliate_commission)::float, 0) AS commission
    FROM orders
    WHERE affiliate_id = ${affiliateId}
      AND payment_status = 'PAID'
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
  ) t
  GROUP BY month
  ORDER BY month
`),




    // db.execute(sql`
    //   SELECT
    //     TO_CHAR(month, 'Mon YY')  AS label,
    //     clicks,
    //     orders,
    //     commission
    //   FROM (
    //     SELECT
    //       DATE_TRUNC('month', created_at) AS month,
    //       COUNT(*)::int                   AS clicks,
    //       0::int                          AS orders,
    //       0::float                        AS commission
    //     FROM affiliate_clicks
    //     WHERE affiliate_id = ${affiliateId}
    //       AND created_at  >= NOW() - INTERVAL '6 months'
    //     GROUP BY DATE_TRUNC('month', created_at)
    //
    //     UNION ALL
    //
    //     SELECT
    //       DATE_TRUNC('month', created_at) AS month,
    //       0::int                          AS clicks,
    //       COUNT(*)::int                   AS orders,
    //       COALESCE(SUM(affiliate_commission)::float, 0) AS commission
    //     FROM orders
    //     WHERE affiliate_id   = ${affiliateId}
    //       AND payment_status = 'PAID'
    //       AND created_at    >= NOW() - INTERVAL '6 months'
    //     GROUP BY DATE_TRUNC('month', created_at)
    //   ) t
    //   GROUP BY month, label
    //   -- re-aggregate after union
    //   -- wrapped query below
    // `),

    // product performance
    db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.main_image_url                    AS image,
        p.price::float                      AS price,
        p.affiliate_commission_rate::float  AS commission_rate,
        COALESCE(c.clicks, 0)::int          AS clicks,
        COALESCE(o.orders, 0)::int          AS orders,
        COALESCE(o.commission, 0)::float    AS commission,
        CASE WHEN COALESCE(c.clicks,0) > 0
          THEN ROUND((COALESCE(o.orders,0)::numeric / c.clicks) * 100, 1)
          ELSE 0
        END::float                          AS cvr
      FROM products p
      LEFT JOIN (
        SELECT product_id, COUNT(*)::int AS clicks
        FROM affiliate_clicks
        WHERE affiliate_id = ${affiliateId}
        GROUP BY product_id
      ) c ON c.product_id = p.id
      LEFT JOIN (
        SELECT product_id,
          COUNT(*)::int AS orders,
          SUM(affiliate_commission)::float AS commission
        FROM orders
        WHERE affiliate_id   = ${affiliateId}
          AND payment_status = 'PAID'
        GROUP BY product_id
      ) o ON o.product_id = p.id
      WHERE p.status = 'active'
        AND (COALESCE(c.clicks,0) > 0 OR COALESCE(o.orders,0) > 0)
      ORDER BY commission DESC, clicks DESC
      LIMIT 10
    `),

    // city breakdown from clicks
    db.execute(sql`
      SELECT
        COALESCE(
          (SELECT o.city FROM orders o
           WHERE o.affiliate_id = ${affiliateId}
             AND o.payment_status = 'PAID'
             AND o.customer_phone LIKE '%'
           LIMIT 1),
          'Unknown'
        ) AS city,
        COUNT(*)::int  AS clicks,
        (
          SELECT COUNT(*)::int FROM orders o2
          WHERE o2.affiliate_id   = ${affiliateId}
            AND o2.payment_status = 'PAID'
        ) AS conversions
      FROM affiliate_clicks ac
      WHERE ac.affiliate_id = ${affiliateId}
        AND ac.created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY city
      ORDER BY clicks DESC
      LIMIT 8
    `),

    // referrer breakdown
    db.execute(sql`
      SELECT
        COALESCE(
          CASE
            WHEN referrer LIKE '%facebook%'  THEN 'Facebook'
            WHEN referrer LIKE '%instagram%' THEN 'Instagram'
            WHEN referrer LIKE '%twitter%'   THEN 'Twitter/X'
            WHEN referrer LIKE '%tiktok%'    THEN 'TikTok'
            WHEN referrer LIKE '%whatsapp%'  THEN 'WhatsApp'
            WHEN referrer LIKE '%google%'    THEN 'Google'
            WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
            ELSE 'Other'
          END,
          'Direct'
        )             AS source,
        COUNT(*)::int AS clicks
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
        AND created_at  >= NOW() - INTERVAL '30 days'
      GROUP BY source
      ORDER BY clicks DESC
    `),

    // summary: 30d vs prev 30d
    db.execute(sql`
      SELECT
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int  AS clicks_30d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '60 days'
                    AND created_at <  NOW() - INTERVAL '30 days' THEN 1 END)::int  AS clicks_prev,
        COUNT(*)::int                                                               AS clicks_all
      FROM affiliate_clicks
      WHERE affiliate_id = ${affiliateId}
    `),

    // recent 10 clicks
    db.execute(sql`
      SELECT
        ac.created_at,
        ac.referrer,
        ac.ip_address,
        p.title AS product_title,
        p.main_image_url AS product_image
      FROM affiliate_clicks ac
      LEFT JOIN products p ON p.id = ac.product_id
      WHERE ac.affiliate_id = ${affiliateId}
      ORDER BY ac.created_at DESC
      LIMIT 10
    `),
  ]);

  // Re-aggregate monthly trends properly
  const monthMap: Record<string, { label: string; clicks: number; orders: number; commission: number }> = {};
  for (const r of monthlyTrends as any[]) {
    if (!monthMap[r.label]) monthMap[r.label] = { label: r.label, clicks: 0, orders: 0, commission: 0 };
    monthMap[r.label].clicks     += Number(r.clicks);
    monthMap[r.label].orders     += Number(r.orders);
    monthMap[r.label].commission += Number(r.commission);
  }
  const monthly = Object.values(monthMap);

  const summary = (summaryStats as any[])[0] ?? { clicks_30d: 0, clicks_prev: 0, clicks_all: 0 };
  const clickChange = summary.clicks_prev > 0
    ? ((summary.clicks_30d - summary.clicks_prev) / summary.clicks_prev) * 100 : 0;

  // Build full 30-day array (fill gaps with 0)
  const today    = new Date();
  const days30: { day: string; clicks: number; orders: number; commission: number }[] = [];
  const clickMap = Object.fromEntries((clicksPerDay as any[]).map(r => [String(r.day).slice(0, 10), r.clicks]));
  const orderMap = Object.fromEntries((ordersPerDay as any[]).map(r => [String(r.day).slice(0, 10), { orders: r.orders, commission: r.commission }]));

  for (let i = 29; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days30.push({
      day:        key,
      clicks:     clickMap[key]     ?? 0,
      orders:     orderMap[key]?.orders     ?? 0,
      commission: orderMap[key]?.commission ?? 0,
    });
  }

  // Hour heatmap — fill all 24 hours
  const hourMap = Object.fromEntries((clicksPerHour as any[]).map(r => [r.hour, r.clicks]));
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: h, clicks: hourMap[h] ?? 0 }));

  // DOW — fill all 7 days
  const dowMap   = Object.fromEntries((clicksPerDayOfWeek as any[]).map(r => [r.dow, r.clicks]));
  const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowData  = Array.from({ length: 7 }, (_, d) => ({ dow: dowLabels[d], clicks: dowMap[d] ?? 0 }));

  return {
    fullName,
    clicks30d:    summary.clicks_30d,
    clicksPrev:   summary.clicks_prev,
    clickChange,
    clicksAll:    summary.clicks_all,
    days30,
    hourData,
    dowData,
    monthly,
    products:     (productPerformance as any[]).map(p => ({
      id: p.id, title: p.title, image: p.image,
      price: p.price, commissionRate: p.commission_rate,
      clicks: p.clicks, orders: p.orders,
      commission: p.commission, cvr: p.cvr,
    })),
    cityData:     (cityBreakdown as any[]).map(r => ({ city: r.city, clicks: r.clicks })),
    referrerData: (referrerBreakdown as any[]).map(r => ({ source: r.source, clicks: r.clicks })),
    recentClicks: (recentClicks as any[]).map(r => ({
      createdAt:    r.created_at,
      referrer:     r.referrer ?? null,
      ipAddress:    r.ip_address ?? null,
      productTitle: r.product_title ?? 'Unknown',
      productImage: r.product_image ?? null,
    })),
  };
}

export default async function AffiliateAnalyticsPage() {
  noStore();
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getAnalyticsData(auth.sub);
  if (!data) redirect('/affiliate/onboarding');

  return (
    <DashboardShell role="AFFILIATE" vendorName={data.fullName}>
      <AffiliateAnalyticsClient data={data} />
    </DashboardShell>
  );
}
