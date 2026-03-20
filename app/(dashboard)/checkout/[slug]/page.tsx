import { db } from '@/lib/utils/db';
import { products, vendorProfiles, categories, affiliateProfiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import Link from 'next/link';

async function getProduct(slug: string) {
  const result = await db
    .select({
      id:                     products.id,
      title:                  products.title,
      slug:                   products.slug,
      price:                  products.price,
      mainImageUrl:           products.mainImageUrl,
      shortDescription:       products.shortDescription,
      affiliateCommissionRate: products.affiliateCommissionRate,
      stockQuantity:          products.stockQuantity,
      vendorId:               products.vendorId,
      shopName:               vendorProfiles.shopName,
      categoryName:           categories.name,
    })
    .from(products)
    .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
    .leftJoin(categories,     eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ aff?: string; qty?: string }>;
}) {
  const { slug }      = await params;
  const sp            = await searchParams;
  const cookieStore   = await cookies();
  const product       = await getProduct(slug);

  if (!product) notFound();
  if (product.stockQuantity < 1) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>Out of Stock</h2>
          <p style={{ color: '#6b7280', marginTop: 8 }}>This product is currently unavailable.</p>
          <Link href="/products" style={{ marginTop: 20, display: 'inline-block', color: '#16a34a', fontWeight: 700 }}>← Back to products</Link>
        </div>
      </div>
    );
  }

  // Resolve affiliate token: URL param > cookie
  const affToken = sp.aff || cookieStore.get('aff_token')?.value || null;

  // Resolve affiliate profile ID if token exists
  let affiliateId: string | null = null;
  if (affToken) {
    const aff = await db
      .select({ id: affiliateProfiles.id })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.affiliateToken, affToken))
      .limit(1);
    if (aff.length) affiliateId = aff[0].id;
  }

  const qty   = Math.min(parseInt(sp.qty ?? '1'), product.stockQuantity);
  const price = parseFloat(product.price);
  const commRate = parseFloat(product.affiliateCommissionRate);

  return (
    <CheckoutForm
      product={{
        id:           product.id,
        title:        product.title,
        slug:         product.slug,
        price,
        mainImageUrl: product.mainImageUrl ?? null,
        shopName:     product.shopName ?? '',
        categoryName: product.categoryName ?? null,
        stockQuantity: product.stockQuantity,
        commissionRate: commRate,
      }}
      affiliateId={affiliateId}
      affToken={affToken}
      defaultQty={qty}
    />
  );
}
