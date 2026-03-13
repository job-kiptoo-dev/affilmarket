import { getAuthUser }              from '@/lib/auth-server';
import { prisma }                   from '@/lib/prisma';
import { redirect }                 from 'next/navigation';
import { DashboardShell }           from '@/components/dashboard/dashboard-shell';
import { VendorProductsClient } from '@/components/vendor/vendor-products';
// import { VendorProductsClient }     from '@/components/vendor/vendor-products-client';

async function getVendorProducts(userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) return null;

  const products = await prisma.product.findMany({
    where:   { vendorId: vendor.id },
    include: { category: { select: { name: true } }, _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return {
    vendor,
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
    <DashboardShell role="VENDOR" vendorName={data.vendor.shopName}>
      <VendorProductsClient
        stats={data.stats}
        products={data.products.map((p) => ({
          id:                      p.id,
          title:                   p.title,
          slug:                    p.slug,
          price:                   p.price.toNumber(),
          stockQuantity:           p.stockQuantity,
          status:                  p.status as any,
          mainImageUrl:            p.mainImageUrl,
          affiliateCommissionRate: p.affiliateCommissionRate.toNumber(),
          category:                p.category?.name ?? null,
          ordersCount:             p._count.orders,
          createdAt:               p.createdAt.toISOString(),
        }))}
      />
    </DashboardShell>
  );
}
