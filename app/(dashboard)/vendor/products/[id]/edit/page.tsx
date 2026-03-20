import { getAuthUser }    from '@/lib/healpers/auth-server';
import { db }             from '@/lib/utils/db';
import { products, vendorProfiles, categories } from '@/drizzle/schema';
import { eq, isNull, asc } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { EditProductForm } from '@/components/vendor/edit-product-form';

async function getProduct(id: string, vendorId: string) {
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  const product = result[0];
  if (!product || product.vendorId !== vendorId) return null;
  return product;
}

async function getFormData(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length) return null;

  const parents = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.name));

  const children = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.parentId, categories.parentId))
    .orderBy(asc(categories.name));

  const cats = parents.map((p) => ({
    ...p,
    children: children.filter((c) => c.parentId === p.id),
  }));

  return { vendor: vendor[0], categories: cats };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth   = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const formData = await getFormData(auth.sub);
  if (!formData) redirect('/vendor/onboarding');

  const product = await getProduct(id, formData.vendor.id);
  if (!product) notFound();

  return (
    <DashboardShell role="VENDOR" vendorName={formData.vendor.shopName}>
      <EditProductForm
        product={{
          id:                     product.id,
          title:                  product.title,
          shortDescription:       product.shortDescription ?? '',
          description:            product.description ?? '',
          categoryId:             product.categoryId ?? '',
          subcategoryId:          product.subcategoryId ?? '',
          sku:                    product.sku ?? '',
          price:                  parseFloat(product.price),
          stockQuantity:          product.stockQuantity,
          mainImageUrl:           product.mainImageUrl ?? '',
          galleryImages:          (product.galleryImages as string[]) ?? [],
          affiliateCommissionRate: parseFloat(product.affiliateCommissionRate) * 100,
          country:                product.country,
          status:                 product.status,
        }}
        categories={formData.categories}
      />
    </DashboardShell>
  );
}
