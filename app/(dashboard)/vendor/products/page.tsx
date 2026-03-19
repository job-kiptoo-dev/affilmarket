import { getAuthUser }          from '@/lib/healpers/auth-server';
import { db }                   from '@/lib/utils/db';
import { vendorProfiles, products as productsTable, categories, orders } from '@/drizzle/schema';
import { eq, desc, sql }        from 'drizzle-orm';
import { redirect }             from 'next/navigation';
import { DashboardShell }       from '@/components/dashboard/dashboard-shell';
import { VendorProductsClient } from '@/components/vendor/vendor-products';

async function getVendorProducts(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length) return null;
  const { id: vendorId, shopName } = vendor[0];

  const products = await db
    .select({
      id:                     productsTable.id,
      title:                  productsTable.title,
      slug:                   productsTable.slug,
      price:                  productsTable.price,
      stockQuantity:          productsTable.stockQuantity,
      status:                 productsTable.status,
      mainImageUrl:           productsTable.mainImageUrl,
      affiliateCommissionRate: productsTable.affiliateCommissionRate,
      createdAt:              productsTable.createdAt,
      categoryName:           categories.name,
      ordersCount:            sql<number>`count(${orders.id})::int`,
    })
    .from(productsTable)
    .leftJoin(categories, eq(productsTable.categoryId, categories.id))
    .leftJoin(orders, eq(productsTable.id, orders.productId))
    .where(eq(productsTable.vendorId, vendorId))
    .groupBy(
      productsTable.id,
      productsTable.title,
      productsTable.slug,
      productsTable.price,
      productsTable.stockQuantity,
      productsTable.status,
      productsTable.mainImageUrl,
      productsTable.affiliateCommissionRate,
      productsTable.createdAt,
      categories.name,
    )
    .orderBy(desc(productsTable.createdAt));

  return {
    shopName,
    products,
    stats: {
      total:    products.length,
      active:   products.filter((p) => p.status === 'active').length,
      draft:    products.filter((p) => p.status === 'draft').length,
      pending:  products.filter((p) => p.status === 'pending_approval').length,
      rejected: products.filter((p) => p.status === 'rejected').length,
    },
  };
}

export default async function VendorProductsPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getVendorProducts(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.shopName}>
      <VendorProductsClient
        stats={data.stats}
        products={data.products.map((p) => ({
          id:                      p.id,
          title:                   p.title,
          slug:                    p.slug,
          price:                   parseFloat(p.price),
          stockQuantity:           p.stockQuantity,
          status:                  p.status as any,
          mainImageUrl:            p.mainImageUrl ?? null,
          affiliateCommissionRate: parseFloat(p.affiliateCommissionRate),
          category:                p.categoryName ?? null,
          ordersCount:             p.ordersCount ?? 0,
          createdAt:               p.createdAt.toISOString(),
        }))}
      />
    </DashboardShell>
  );
}
