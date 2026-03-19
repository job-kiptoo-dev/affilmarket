import { redirect }          from 'next/navigation';
import { getAuthUser }       from '@/lib/healpers/auth-server';
import { db }                from '@/lib/utils/db';
import {
  products, vendorProfiles,
  categories, affiliateProfiles,
} from '@/drizzle/schema';
import { eq, desc, and, ilike, or } from 'drizzle-orm';
import { DashboardShell }    from '@/components/dashboard/dashboard-shell';
import { AffiliateProductsClient } from '@/components/affiliate/affiliate-products-client';

async function getProducts(search?: string, categoryId?: string) {
  const conditions = [eq(products.status, 'active')];
  if (search) {
    conditions.push(
      or(
        ilike(products.title, `%${search}%`),
        ilike(products.shortDescription, `%${search}%`),
      )!
    );
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  return db
    .select({
      id:                     products.id,
      title:                  products.title,
      slug:                   products.slug,
      price:                  products.price,
      mainImageUrl:           products.mainImageUrl,
      shortDescription:       products.shortDescription,
      affiliateCommissionRate: products.affiliateCommissionRate,
      country:                products.country,
      shopName:               vendorProfiles.shopName,
      categoryName:           categories.name,
    })
    .from(products)
    .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
    .leftJoin(categories,     eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.affiliateCommissionRate))
    .limit(60);
}

async function getCategories() {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(categories.name);
}

export default async function AffiliateProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const params = await searchParams;

  const affiliateProfile = await db
    .select({ affiliateToken: affiliateProfiles.affiliateToken })
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, auth.sub))
    .limit(1);

  if (!affiliateProfile.length) redirect('/affiliate/onboarding');

  const [prods, cats] = await Promise.all([
    getProducts(params.q, params.category),
    getCategories(),
  ]);

  return (
    <DashboardShell role="AFFILIATE" >
      <AffiliateProductsClient
        products={prods.map((p) => ({
          ...p,
          price:                  parseFloat(p.price),
          affiliateCommissionRate: parseFloat(p.affiliateCommissionRate),
          mainImageUrl:           p.mainImageUrl ?? null,
          shortDescription:       p.shortDescription ?? null,
          shopName:               p.shopName ?? '',
          categoryName:           p.categoryName ?? null,
        }))}
        categories={cats}
        affiliateToken={affiliateProfile[0].affiliateToken}
        initialSearch={params.q ?? ''}
        initialCategory={params.category ?? ''}
      />
    </DashboardShell>
  );
}
