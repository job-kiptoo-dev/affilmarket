import { getAuthUser }     from '@/lib/healpers/auth-server';
import { db }              from '@/lib/utils/db';
import { vendorProfiles, categories as categoriesTable } from '@/drizzle/schema';
import { eq, isNull, asc } from 'drizzle-orm';
import { redirect }        from 'next/navigation';
import { DashboardShell }  from '@/components/dashboard/dashboard-shell';
import { NewProductForm }  from '@/components/vendor/new-product-form';

async function getFormData(userId: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length) return null;

  // Fetch parent categories
  const parents = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(isNull(categoriesTable.parentId))
    .orderBy(asc(categoriesTable.name));

  // Fetch all children in one query
  const children = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug, parentId: categoriesTable.parentId })
    .from(categoriesTable)
    .where(eq(categoriesTable.parentId, categoriesTable.parentId))
    .orderBy(asc(categoriesTable.name));

  // Attach children to parents
  const categories = parents.map((parent) => ({
    ...parent,
    children: children.filter((c) => c.parentId === parent.id),
  }));

  return { vendor: vendor[0], categories };
}

export default async function NewProductPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getFormData(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.vendor.shopName}>
      <NewProductForm categories={data.categories} />
    </DashboardShell>
  );
}
