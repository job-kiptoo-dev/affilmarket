// ─── Drop-in replacement for the two flag functions in app/admin/page.tsx ────
// Uses affiliateClicks + orders tables via subqueries instead of stored columns.

import { db }  from '@/lib/utils/db';
import { sql } from 'drizzle-orm';

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

// Usage in app/admin/page.tsx:
// import { getFlaggedVendors, getFlaggedAffiliates } from '@/lib/admin/flags';
// const [flaggedVendors, flaggedAffiliates] = await Promise.all([
//   getFlaggedVendors(),
//   getFlaggedAffiliates(),
// ]);
