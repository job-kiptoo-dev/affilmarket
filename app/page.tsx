// import { auth }          from '@/lib/auth';
import { headers }       from 'next/headers';
// import { db }            from '@/lib/db';
import { products as productsTable, categories as categoriesTable, vendorProfiles, reviews, orders } from '@/drizzle/schema';
import { eq, desc, isNull, count } from 'drizzle-orm';
import { Navbar }        from '@/components/layout/navbar';
import { HeroSection }   from '@/components/layout/hero-section';
import { StatsBar }      from '@/components/layout/stats-bar';
import { HowItWorks }    from '@/components/layout/how-it-works';
import { CategoryGrid }  from '@/components/products/category-grid';
import { ProductCard }   from '@/components/products/product-card';
import { Footer }        from '@/components/layout/footer';
import Link              from 'next/link';
import { db } from '@/lib/utils/db';
import { auth } from '@/lib/utils/auth';
// import { db } from '@/lib/utils/db';

async function getFeaturedProducts() {
  return db
    .select({
      id:                     productsTable.id,
      title:                  productsTable.title,
      slug:                   productsTable.slug,
      price:                  productsTable.price,
      mainImageUrl:           productsTable.mainImageUrl,
      shortDescription:       productsTable.shortDescription,
      affiliateCommissionRate: productsTable.affiliateCommissionRate,
      vendor: {
        shopName:    vendorProfiles.shopName,
        shopAddress: vendorProfiles.shopAddress,
      },
      category: {
        name: categoriesTable.name,
      },
    })
    .from(productsTable)
    .leftJoin(vendorProfiles,    eq(productsTable.vendorId,   vendorProfiles.id))
    .leftJoin(categoriesTable,   eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.status, 'active'))
    .orderBy(desc(productsTable.createdAt))
    .limit(8);
}

async function getCategories() {
  const rows = await db
    .select({
      id:   categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      icon: categoriesTable.icon,
      productCount: count(productsTable.id),
    })
    .from(categoriesTable)
    .leftJoin(productsTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(isNull(categoriesTable.parentId))
    .groupBy(
      categoriesTable.id,
      categoriesTable.name,
      categoriesTable.slug,
      categoriesTable.icon,
    )
    .orderBy(categoriesTable.name);

  return rows;
}

export default async function HomePage() {
  const [featuredProducts, cats, session] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const user = session?.user ?? null;

  return (
    <>
      <Navbar
      />
      <HeroSection />
      <StatsBar />

      {/* Categories */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', margin: 0, marginBottom: 6 }}>
              Browse Categories
            </h2>
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Explore products across all categories</p>
          </div>
          <Link href="/products" style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        <CategoryGrid
          categories={cats.map((c) => ({
            id:     c.id,
            name:   c.name,
            slug:   c.slug,
            icon:   c.icon ?? null,
            _count: { products: c.productCount ?? 0 },
          }))}
        />
      </section>

      {/* Featured Products */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', margin: 0, marginBottom: 6 }}>
              Featured Products
            </h2>
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>
              Hand-picked products with the highest affiliate commissions
            </p>
          </div>
          <Link href="/products" style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: '#f9fafb', borderRadius: 16, border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🛍️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>No products yet</h3>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px' }}>
              Be the first vendor to list on AffilMarket Kenya
            </p>
            <Link
              href="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#16a34a', color: '#fff', borderRadius: 9,
                padding: '10px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Start Selling →
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}>
            {featuredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id:                      p.id,
                  title:                   p.title,
                  slug:                    p.slug,
                  price:                   parseFloat(p.price),
                  mainImageUrl:            p.mainImageUrl ?? null,
                  shortDescription:        p.shortDescription ?? null,
                  affiliateCommissionRate: parseFloat(p.affiliateCommissionRate),
                  vendor: {
                    shopName:    p.vendor?.shopName ?? '',
                    shopAddress: p.vendor?.shopAddress ?? null,
                  },
                  category: p.category?.name ? { name: p.category.name } : null,
                  _count: { orders: 0, reviews: 0 },
                }}
              />
            ))}
          </div>
        )}
      </section>

      <HowItWorks />

      {/* Dual CTA */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          <div style={{ background: '#16a34a', borderRadius: 20, padding: '40px 36px' }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#bbf7d0',
              textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12,
            }}>For Vendors</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 10px' }}>
              Sell more with an affiliate army
            </h3>
            <p style={{ fontSize: 14, color: '#dcfce7', margin: '0 0 24px', lineHeight: 1.7 }}>
              List your products free. Set your own commissions. Let thousands of affiliates drive sales.
              M-Pesa payouts same day.
            </p>
            <Link
              href="/register?role=vendor"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff', color: '#16a34a', borderRadius: 9,
                padding: '11px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              List Your Product Free →
            </Link>
          </div>

          <div style={{ background: '#111', borderRadius: 20, padding: '40px 36px' }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: '#d97706',
              textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12,
            }}>For Affiliates</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 10px' }}>
              Earn commissions sharing links
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.7 }}>
              Browse products. Get your unique link in one click. Share on WhatsApp, TikTok, Instagram.
              Paid to M-Pesa.
            </p>
            <Link
              href="/register?role=affiliate"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#d97706', color: '#fff', borderRadius: 9,
                padding: '11px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Start Earning Today →
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}
