import { NextRequest, NextResponse } from 'next/server';
import { db }                        from '@/lib/utils/db';
import {
  orders, products, vendorProfiles,
  balances, affiliateProfiles,
}                                    from '@/drizzle/schema';
import { eq, and, lte, sql }         from 'drizzle-orm';
import { sendDeliveryReminderEmail } from '@/lib/healpers/resend';
// import { sendDeliveryReminderEmail } from '@/lib/resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron, not a random request
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now      = new Date();
  const day6ago  = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const day7ago  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── 1. Auto-deliver orders older than 7 days ──────────────────
  const toDeliver = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.orderStatus,   'CONFIRMED'),
        eq(orders.paymentStatus, 'PAID'),
        lte(orders.createdAt,    day7ago),
      )
    );

  let delivered = 0;
  for (const order of toDeliver) {
    // Mark delivered
    await db.update(orders)
      .set({ orderStatus: 'DELIVERED', balancesReleased: false })
      .where(eq(orders.id, order.id));

    // Release vendor balance
    if (order.vendorEarnings) {
      const vendor = await db
        .select({ userId: vendorProfiles.userId })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.id, order.vendorId))
        .limit(1);

      if (vendor.length) {
        await db.update(balances)
          .set({
            pendingBalance:   sql`${balances.pendingBalance}   - ${order.vendorEarnings}`,
            availableBalance: sql`${balances.availableBalance} + ${order.vendorEarnings}`,
          })
          .where(eq(balances.userId, vendor[0].userId));
      }
    }

    // Release affiliate balance
    if (order.affiliateId && order.affiliateCommission) {
      const aff = await db
        .select({ userId: affiliateProfiles.userId })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.id, order.affiliateId))
        .limit(1);

      if (aff.length) {
        await db.update(balances)
          .set({
            pendingBalance:   sql`${balances.pendingBalance}   - ${order.affiliateCommission}`,
            availableBalance: sql`${balances.availableBalance} + ${order.affiliateCommission}`,
          })
          .where(eq(balances.userId, aff[0].userId));
      }
    }

    await db.update(orders)
      .set({ balancesReleased: true })
      .where(eq(orders.id, order.id));

    delivered++;
  }

  // ── 2. Send reminder emails for orders at day 6 ───────────────
  const toRemind = await db
    .select({
      id:            orders.id,
      customerEmail: orders.customerEmail,
      customerName:  orders.customerName,
      productTitle:  products.title,
      productImage:  products.mainImageUrl,
      shopName:      vendorProfiles.shopName,
    })
    .from(orders)
    .leftJoin(products,       eq(orders.productId, products.id))
    .leftJoin(vendorProfiles, eq(orders.vendorId,  vendorProfiles.id))
    .where(
      and(
        eq(orders.orderStatus,   'CONFIRMED'),
        eq(orders.paymentStatus, 'PAID'),
        lte(orders.createdAt,    day6ago),
        // not already in the 7-day bucket
        sql`${orders.createdAt} > ${day7ago}`,
      )
    );

  let reminded = 0;
  for (const order of toRemind) {
    if (!order.customerEmail) continue;

    await sendDeliveryReminderEmail({
      customerEmail: order.customerEmail,
      customerName:  order.customerName,
      productTitle:  order.productTitle  ?? 'Your Order',
      shopName:      order.shopName      ?? 'the vendor',
      orderId:       order.id,
      confirmUrl:    `${APP_URL}/orders/${order.id}/confirm`,
      productImage:  order.productImage  ?? null,
    }).catch(console.error); // non-blocking

    reminded++;
  }

  console.log(`[cron] auto-delivered: ${delivered}, reminders sent: ${reminded}`);
  return NextResponse.json({ delivered, reminded });
}
