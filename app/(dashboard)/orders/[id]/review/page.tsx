import { db }      from '@/lib/utils/db';
import { orders, products } from '@/drizzle/schema';
import { eq }      from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ReviewForm } from '@/components/reviews/review-form';
import Link         from 'next/link';

export default async function OrderReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db
    .select({
      id:          orders.id,
      orderStatus: orders.orderStatus,
      productTitle: products.title,
      productImage: products.mainImageUrl,
    })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order.length) notFound();

  const o = order[0];

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: '#111', textDecoration: 'none', letterSpacing: '-0.03em' }}>
            <span style={{ color: '#16a34a' }}>Affil</span>Market
          </Link>
        </div>

        {/* Product */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 14, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            background: '#f3f4f6', overflow: 'hidden',
            border: '1px solid #e5e7eb', flexShrink: 0,
          }}>
            {o.productImage
              ? <img src={o.productImage} alt={o.productTitle ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛍️</div>}
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>Your order</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{o.productTitle}</div>
          </div>
        </div>

        {o.orderStatus !== 'DELIVERED' ? (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 12, padding: '16px 20px',
            fontSize: 14, color: '#92400e', textAlign: 'center',
          }}>
            ⏳ Reviews are available after your order is delivered.
          </div>
        ) : (
          <ReviewForm
            orderId={o.id}
            productTitle={o.productTitle ?? ''}
          />
        )}
      </div>
    </div>
  );
}
