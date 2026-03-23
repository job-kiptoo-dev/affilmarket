'use server';
import { db }             from '@/lib/utils/db';
import { orders, vendorProfiles, balances, affiliateProfiles, products } from '@/drizzle/schema'; // ← add products
import { eq, and, sql }   from 'drizzle-orm';
import { getAuthUser }    from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';
import { sendDeliveryConfirmationEmail } from '@/lib/resend'; // ← add this

export async function updateOrderStatus(
  orderId:  string,
  status:   'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

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

  // ── On SHIPPED: send delivery confirmation email ───────────────
  if (status === 'SHIPPED' && o.customerEmail) {
    const productInfo = await db
      .select({ title: products.title })
      .from(products)
      .where(eq(products.id, o.productId))
      .limit(1);

    const vendorInfo = await db
      .select({ shopName: vendorProfiles.shopName })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.id, o.vendorId))
      .limit(1);

    // Non-blocking — don't fail the status update if email fails
    sendDeliveryConfirmationEmail({
      customerEmail: o.customerEmail,
      customerName:  o.customerName,
      productTitle:  productInfo[0]?.title   ?? 'Your order',
      orderId,
      shopName:      vendorInfo[0]?.shopName ?? 'AffilMarket Vendor',
    }).catch(err => console.error('[updateOrderStatus] email failed:', err));
  }

  // ── On DELIVERED: release pending balances ─────────────────────
  if (status === 'DELIVERED' && !o.balancesReleased && o.paymentStatus === 'PAID') {
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

    await db.update(orders)
      .set({ balancesReleased: true })
      .where(eq(orders.id, orderId));
  }

  revalidatePath('/vendor/orders');
  return { success: true };
}
