import { db }          from '@/lib/utils/db';
import { products, vendorProfiles, categories } from '@/drizzle/schema';
import { eq, desc, and, ilike, or, isNull } from 'drizzle-orm';
import Link            from 'next/link';
import { formatKES }   from '@/lib/utils';
import { ShoppingBag, Search } from 'lucide-react';

async function getProducts(search?: string, categorySlug?: string) {
  const conditions = [eq(products.status, 'active')];

  if (search) {
    conditions.push(
      or(
        ilike(products.title, `%${search}%`),
        ilike(products.shortDescription, `%${search}%`),
      )!
    );
  }

  if (categorySlug) {
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, categorySlug))
      .limit(1);
    if (cat.length) conditions.push(eq(products.categoryId, cat[0].id));
  }

  return db
    .select({
      id:                     products.id,
      title:                  products.title,
      slug:                   products.slug,
      price:                  products.price,
      mainImageUrl:           products.mainImageUrl,
      shortDescription:       products.shortDescription,
      affiliateCommissionRate: products.affiliateCommissionRate,
      shopName:               vendorProfiles.shopName,
      categoryName:           categories.name,
      categorySlug:           categories.slug,
    })
    .from(products)
    .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
    .leftJoin(categories,     eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt))
    .limit(60);
}

async function getCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, icon: categories.icon })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(categories.name);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const [prods, cats] = await Promise.all([
    getProducts(params.q, params.category),
    getCategories(),
  ]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .pl { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #f8f7f4; }
        .pl-nav { background: #fff; border-bottom: 1px solid #e5e7eb; height: 60px; display: flex; align-items: center; padding: 0 24px; gap: 16px; position: sticky; top: 0; z-index: 50; }
        .pl-logo { font-size: 18px; font-weight: 800; color: #111; text-decoration: none; letter-spacing: -0.03em; }
        .pl-logo span { color: #16a34a; }
        .pl-nav-links { display: flex; gap: 20px; margin-left: 32px; }
        .pl-nav-link { font-size: 13.5px; font-weight: 600; color: #6b7280; text-decoration: none; }
        .pl-nav-link:hover { color: #111; }
        .pl-nav-link.active { color: #16a34a; }
        .pl-hero { background: #111; padding: 56px 24px; text-align: center; }
        .pl-hero-title { font-size: 38px; font-weight: 800; color: #fff; letter-spacing: -0.04em; margin-bottom: 8px; }
        .pl-hero-title span { color: #4ade80; }
        .pl-hero-sub { font-size: 16px; color: #9ca3af; margin-bottom: 28px; }
        .pl-search-wrap { max-width: 520px; margin: 0 auto; position: relative; }
        .pl-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
        .pl-search { width: 100%; padding: 14px 16px 14px 46px; border-radius: 14px; border: none; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; }
        .pl-body { max-width: 1280px; margin: 0 auto; padding: 32px 24px; }
        .pl-cats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
        .pl-cat-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 100px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; text-decoration: none; transition: all 0.15s; white-space: nowrap; }
        .pl-cat-btn:hover { border-color: #16a34a; color: #16a34a; }
        .pl-cat-btn.active { background: #16a34a; border-color: #16a34a; color: #fff; }
        .pl-meta { font-size: 13.5px; color: #9ca3af; margin-bottom: 20px; font-weight: 600; }
        .pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
        .pl-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; text-decoration: none; transition: all 0.2s; display: flex; flex-direction: column; }
        .pl-card:hover { border-color: #d1d5db; box-shadow: 0 8px 24px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .pl-card-img { aspect-ratio: 4/3; background: #f3f4f6; overflow: hidden; position: relative; }
        .pl-card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .pl-card:hover .pl-card-img img { transform: scale(1.04); }
        .pl-card-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
        .pl-comm-badge { position: absolute; top: 10px; right: 10px; background: #16a34a; color: #fff; font-size: 11px; font-weight: 800; border-radius: 7px; padding: 3px 9px; }
        .pl-card-body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; }
        .pl-card-meta { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; margin-bottom: 5px; }
        .pl-card-title { font-size: 14.5px; font-weight: 700; color: #111; letter-spacing: -0.02em; margin-bottom: 5px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .pl-card-desc { font-size: 12.5px; color: #6b7280; line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px; }
        .pl-card-footer { display: flex; align-items: center; justify-content: space-between; }
        .pl-card-price { font-size: 16px; font-weight: 800; color: #111; letter-spacing: -0.03em; }
        .pl-card-shop { font-size: 11.5px; color: #9ca3af; font-weight: 600; }
        .pl-buy-btn { background: #111; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
        .pl-buy-btn:hover { background: #16a34a; }
        .pl-empty { text-align: center; padding: 80px 20px; }
        .pl-empty-icon { font-size: 52px; margin-bottom: 16px; }
        .pl-empty-title { font-size: 20px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .pl-empty-desc { font-size: 14px; color: #9ca3af; }
        @media (max-width: 640px) { .pl-hero-title { font-size: 28px; } .pl-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 400px) { .pl-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="pl">
        {/* Navbar */}
        <nav className="pl-nav">
          <Link href="/" className="pl-logo"><span>Affil</span>Market</Link>
          <div className="pl-nav-links">
            <Link href="/products" className="pl-nav-link active">Products</Link>
            <Link href="/register?role=affiliate" className="pl-nav-link">Become Affiliate</Link>
            <Link href="/register?role=vendor" className="pl-nav-link">Sell</Link>
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/login" style={{ fontSize: 13.5, fontWeight: 700, color: '#111', textDecoration: 'none', padding: '8px 16px', border: '1.5px solid #e5e7eb', borderRadius: 9 }}>
            Sign in
          </Link>
        </nav>

        {/* Hero + Search */}
        <div className="pl-hero">
          <h1 className="pl-hero-title">Shop on <span>AffilMarket</span></h1>
          <p className="pl-hero-sub">Quality products from verified Kenyan vendors</p>
          <form className="pl-search-wrap" action="/products" method="get">
            <Search size={16} className="pl-search-icon" />
            <input
              className="pl-search"
              name="q"
              defaultValue={params.q}
              placeholder="Search products..."
            />
          </form>
        </div>

        <div className="pl-body">
          {/* Category filters */}
          <div className="pl-cats">
            <Link href="/products" className={`pl-cat-btn${!params.category ? ' active' : ''}`}>
              All
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}${params.q ? `&q=${params.q}` : ''}`}
                className={`pl-cat-btn${params.category === c.slug ? ' active' : ''}`}
              >
                {c.icon} {c.name}
              </Link>
            ))}
          </div>

          <div className="pl-meta">{prods.length} products{params.q ? ` for "${params.q}"` : ''}</div>

          {prods.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty-icon">🔍</div>
              <div className="pl-empty-title">No products found</div>
              <div className="pl-empty-desc">Try a different search or category</div>
            </div>
          ) : (
            <div className="pl-grid">
              {prods.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="pl-card">
                  <div className="pl-card-img">
                    {p.mainImageUrl
                      ? <img src={p.mainImageUrl} alt={p.title} />
                      : <div className="pl-card-placeholder">🛍️</div>}
                    <div className="pl-comm-badge">
                      {(parseFloat(p.affiliateCommissionRate) * 100).toFixed(0)}% comm
                    </div>
                  </div>
                  <div className="pl-card-body">
                    <div className="pl-card-meta">
                      {p.categoryName ?? 'General'} · {p.shopName}
                    </div>
                    <div className="pl-card-title">{p.title}</div>
                    {p.shortDescription && (
                      <div className="pl-card-desc">{p.shortDescription}</div>
                    )}
                    <div className="pl-card-footer">
                      <div>
                        <div className="pl-card-price">{formatKES(parseFloat(p.price))}</div>
                      </div>
                      <button className="pl-buy-btn">Buy Now</button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
