'use server';

import { db }             from '@/lib/utils/db';
import { orders, vendorProfiles, balances, affiliateProfiles } from '@/drizzle/schema';
import { eq, and, sql }   from 'drizzle-orm';
import { getAuthUser }    from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(
  orderId:  string,
  status:   'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

  // Verify this order belongs to this vendor
  const vendor = await db
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (!vendor.length) return { error: 'Vendor not found' };

  const order = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.vendorId, vendor[0].id)))
    .limit(1);

  if (!order.length) return { error: 'Order not found' };

  const o = order[0];

  await db.update(orders)
    .set({ orderStatus: status })
    .where(eq(orders.id, orderId));

  // ── On DELIVERED: release pending balances ─────────────────────
  if (status === 'DELIVERED' && !o.balancesReleased && o.paymentStatus === 'PAID') {

    // Move vendor pendingBalance → availableBalance
    if (o.vendorEarnings) {
      const vendorUser = await db
        .select({ userId: vendorProfiles.userId })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.id, o.vendorId))
        .limit(1);

      if (vendorUser.length) {
        await db.update(balances)
          .set({
            pendingBalance:   sql`${balances.pendingBalance}   - ${o.vendorEarnings}`,
            availableBalance: sql`${balances.availableBalance} + ${o.vendorEarnings}`,
          })
          .where(eq(balances.userId, vendorUser[0].userId));
      }
    }

    // Move affiliate pendingBalance → availableBalance
    if (o.affiliateId && o.affiliateCommission) {
      const affUser = await db
        .select({ userId: affiliateProfiles.userId })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.id, o.affiliateId))
        .limit(1);

      if (affUser.length) {
        await db.update(balances)
          .set({
            pendingBalance:   sql`${balances.pendingBalance}   - ${o.affiliateCommission}`,
            availableBalance: sql`${balances.availableBalance} + ${o.affiliateCommission}`,
          })
          .where(eq(balances.userId, affUser[0].userId));
      }
    }

    // Mark balances as released
    await db.update(orders)
      .set({ balancesReleased: true })
      .where(eq(orders.id, orderId));
  }

  revalidatePath('/vendor/orders');
  return { success: true };
}
