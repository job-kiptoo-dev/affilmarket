import { db }      from '@/lib/db';
import { orders, products, vendorProfiles, balances, affiliateProfiles } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link         from 'next/link';

async function confirmDelivery(orderId: string) {
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order.length) return { error: 'Order not found' };

  const o = order[0];

  if (o.orderStatus === 'DELIVERED') {
    return { alreadyConfirmed: true };
  }

  if (!['SHIPPED', 'CONFIRMED'].includes(o.orderStatus)) {
    return { error: 'This order cannot be confirmed yet' };
  }

  // Mark as delivered
  await db.update(orders)
    .set({ orderStatus: 'DELIVERED', balancesReleased: false })
    .where(eq(orders.id, orderId));

  // Release vendor balance
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

  // Release affiliate balance
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

  // Mark balances released
  await db.update(orders)
    .set({ balancesReleased: true })
    .where(eq(orders.id, orderId));

  return { success: true };
}

export default async function ConfirmDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = await params;
  const result   = await confirmDelivery(id);

  // Fetch product info for display
  const orderInfo = await db
    .select({
      productTitle: products.title,
      productImage: products.mainImageUrl,
      shopName:     vendorProfiles.shopName,
    })
    .from(orders)
    .leftJoin(products,       eq(orders.productId, products.id))
    .leftJoin(vendorProfiles, eq(orders.vendorId,  vendorProfiles.id))
    .where(eq(orders.id, id))
    .limit(1);

  const info = orderInfo[0];

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>

        {/* Logo */}
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: '#111', textDecoration: 'none', letterSpacing: '-0.03em', display: 'block', marginBottom: 32 }}>
          <span style={{ color: '#16a34a' }}>Affil</span>Market
        </Link>

        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 20, padding: '40px 32px',
        }}>
          {result.error ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                Unable to Confirm
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
                {result.error}
              </p>
            </>
          ) : result.alreadyConfirmed ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                Already Confirmed
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
                You've already confirmed delivery for this order. Thank you!
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                Delivery Confirmed!
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                Thank you for confirming. Payment has been released to <strong>{info?.shopName}</strong>.
              </p>

              {/* Product */}
              {info && (
                <div style={{
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginBottom: 24, textAlign: 'left',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: '#f3f4f6', overflow: 'hidden',
                    border: '1px solid #e5e7eb', flexShrink: 0,
                  }}>
                    {info.productImage
                      ? <img src={info.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛍️</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111' }}>{info.productTitle}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{info.shopName}</div>
                  </div>
                </div>
              )}

              {/* Review CTA */}
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 12, padding: '16px 20px', marginBottom: 20,
              }}>
                <p style={{ fontSize: 13.5, color: '#15803d', fontWeight: 600, margin: '0 0 10px' }}>
                  Happy with your purchase?
                </p>
                <Link
                  href={`/orders/${id}/review`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#16a34a', color: '#fff', borderRadius: 9,
                    padding: '10px 20px', fontSize: 13.5, fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  ⭐ Leave a Review
                </Link>
              </div>
            </>
          )}

          <Link
            href="/products"
            style={{ fontSize: 13.5, color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
