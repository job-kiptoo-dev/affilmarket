import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { NewProductForm } from '@/components/vendor/new-product-form';

async function getFormData(userId: string) {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true, shopName: true },
  });
  if (!vendor) return null;

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return { vendor, categories };
}

export default async function NewProductPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    redirect('/login');
  }

  const data = await getFormData(auth.sub);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.vendor.shopName}>
      <NewProductForm
        categories={data.categories.map((c) => ({
          id:       c.id,
          name:     c.name,
          slug:     c.slug,
          children: c.children,
        }))}
      />
    </DashboardShell>
  );
}
