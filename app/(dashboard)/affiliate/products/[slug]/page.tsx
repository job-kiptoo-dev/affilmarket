import { db }             from '@/lib/utils/db';
import { products, vendorProfiles, categories, reviews, orders } from '@/drizzle/schema';
import { eq, sql }        from 'drizzle-orm';
import { notFound }       from 'next/navigation';
import { formatKES }      from '@/lib/utils';
import Link               from 'next/link';
import { ShoppingBag, Star, Store, Tag, ArrowLeft } from 'lucide-react';

async function getProduct(slug: string) {
  const result = await db
    .select({
      id:                     products.id,
      title:                  products.title,
      slug:                   products.slug,
      price:                  products.price,
      shortDescription:       products.shortDescription,
      description:            products.description,
      mainImageUrl:           products.mainImageUrl,
      galleryImages:          products.galleryImages,
      affiliateCommissionRate: products.affiliateCommissionRate,
      stockQuantity:          products.stockQuantity,
      country:                products.country,
      shopName:               vendorProfiles.shopName,
      shopDescription:        vendorProfiles.description,
      logoUrl:                vendorProfiles.logoUrl,
      categoryName:           categories.name,
      orderCount:             sql<number>`count(distinct ${orders.id})::int`,
    })
    .from(products)
    .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
    .leftJoin(categories,     eq(products.categoryId, categories.id))
    .leftJoin(orders,         eq(products.id, orders.productId))
    .where(eq(products.slug, slug))
    .groupBy(
      products.id, vendorProfiles.shopName, vendorProfiles.description,
      vendorProfiles.logoUrl, categories.name,
    )
    .limit(1);

  return result[0] ?? null;
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ aff?: string }>;
}) {
  const { slug } = await params;
  const { aff }  = await searchParams;
  const product  = await getProduct(slug);

  if (!product) notFound();

  const price      = parseFloat(product.price);
  const commRate   = parseFloat(product.affiliateCommissionRate);
  const commission = (price * commRate).toFixed(0);
  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL;
  const affLink    = `${baseUrl}/products/${slug}${aff ? `?aff=${aff}` : ''}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .pp { font-family: 'DM Sans', sans-serif; background: #f8f7f4; min-height: 100vh; }
        .pp-nav { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 0 24px; height: 60px; display: flex; align-items: center; gap: 16px; }
        .pp-nav-logo { font-size: 18px; font-weight: 800; color: #111; text-decoration: none; letter-spacing: -0.03em; }
        .pp-nav-logo span { color: #16a34a; }
        .pp-body { max-width: 1100px; margin: 0 auto; padding: 32px 24px; display: grid; grid-template-columns: 1fr 400px; gap: 32px; }
        .pp-images { display: flex; flex-direction: column; gap: 12px; }
        .pp-main-img { aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb; }
        .pp-main-img img { width: 100%; height: 100%; object-fit: cover; }
        .pp-main-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 80px; }
        .pp-right { display: flex; flex-direction: column; gap: 16px; }
        .pp-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
        .pp-category { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a; margin-bottom: 8px; }
        .pp-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; line-height: 1.2; margin-bottom: 12px; }
        .pp-price { font-size: 32px; font-weight: 800; color: #111; letter-spacing: -0.04em; margin-bottom: 4px; }
        .pp-stock { font-size: 13px; color: #16a34a; font-weight: 600; margin-bottom: 16px; }
        .pp-desc { font-size: 14px; color: #6b7280; line-height: 1.7; }
        .pp-buy-btn {
          width: 100%; padding: 14px; background: #16a34a; color: #fff;
          border: none; border-radius: 12px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s;
        }
        .pp-buy-btn:hover { background: #15803d; }
        .pp-comm-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; }
        .pp-comm-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #15803d; margin-bottom: 4px; }
        .pp-comm-amount { font-size: 28px; font-weight: 800; color: #16a34a; letter-spacing: -0.04em; }
        .pp-comm-sub { font-size: 12.5px; color: #15803d; margin-top: 2px; }
        .pp-aff-badge { background: #111; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
        .pp-aff-token { font-family: monospace; font-size: 13px; color: #4ade80; font-weight: 700; letter-spacing: 0.08em; }
        .pp-aff-label { font-size: 11px; color: #6b7280; }
        .pp-vendor-card { display: flex; align-items: center; gap: 14px; }
        .pp-vendor-logo { width: 44px; height: 44px; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; overflow: hidden; }
        .pp-vendor-name { font-size: 14px; font-weight: 700; color: #111; }
        .pp-vendor-sub { font-size: 12px; color: #9ca3af; }
        .pp-stats { display: flex; gap: 16px; }
        .pp-stat { text-align: center; flex: 1; padding: 12px; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb; }
        .pp-stat-val { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.03em; }
        .pp-stat-label { font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
        @media (max-width: 800px) { .pp-body { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pp">
        {/* Navbar */}
        <nav className="pp-nav">
          <Link href="/" className="pp-nav-logo">
            <span>Affil</span>Market
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/products" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 600 }}>
            ← Browse
          </Link>
        </nav>

        <div className="pp-body">
          {/* Left — Images */}
          <div className="pp-images">
            <div className="pp-main-img">
              {product.mainImageUrl
                ? <img src={product.mainImageUrl} alt={product.title} />
                : <div className="pp-main-img-placeholder">🛍️</div>}
            </div>
          </div>

          {/* Right — Details */}
          <div className="pp-right">
            <div className="pp-card">
              {product.categoryName && (
                <div className="pp-category">{product.categoryName}</div>
              )}
              <div className="pp-title">{product.title}</div>
              <div className="pp-price">{formatKES(price)}</div>
              <div className="pp-stock">
                {product.stockQuantity > 0 ? `✓ ${product.stockQuantity} in stock` : '⚠ Out of stock'}
              </div>
              {product.shortDescription && (
                <div className="pp-desc">{product.shortDescription}</div>
              )}
              <button className="pp-buy-btn" style={{ marginTop: 20 }}>
                <ShoppingBag size={16} /> Buy Now
              </button>
            </div>

            {/* Affiliate commission card — only show if aff token present */}
            {aff && (
              <div className="pp-comm-card">
                <div className="pp-comm-label">Your commission on this sale</div>
                <div className="pp-comm-amount">+KES {commission}</div>
                <div className="pp-comm-sub">{(commRate * 100).toFixed(0)}% of {formatKES(price)}</div>
                <div className="pp-aff-badge" style={{ marginTop: 14 }}>
                  <div>
                    <div className="pp-aff-label">Tracking via token</div>
                    <div className="pp-aff-token">{aff}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pp-stats">
              <div className="pp-stat">
                <div className="pp-stat-val">{product.orderCount}</div>
                <div className="pp-stat-label">Orders</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-val">{(commRate * 100).toFixed(0)}%</div>
                <div className="pp-stat-label">Commission</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-val">{product.country}</div>
                <div className="pp-stat-label">Market</div>
              </div>
            </div>

            {/* Vendor */}
            <div className="pp-card">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 12 }}>Sold by</div>
              <div className="pp-vendor-card">
                <div className="pp-vendor-logo">
                  {product.logoUrl
                    ? <img src={product.logoUrl} alt={product.shopName ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Store size={20} color="#16a34a" />}
                </div>
                <div>
                  <div className="pp-vendor-name">{product.shopName}</div>
                  <div className="pp-vendor-sub">{product.shopDescription?.slice(0, 60) ?? 'Verified vendor on AffilMarket'}</div>
                </div>
              </div>
            </div>

            {/* Full description */}
            {product.description && (
              <div className="pp-card">
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>About this product</div>
                <div className="pp-desc">{product.description}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
