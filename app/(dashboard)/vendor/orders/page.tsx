import { getAuthUser }    from '@/lib/healpers/auth-server';
import { db }             from '@/lib/utils/db';
import {
  orders as ordersTable, products, vendorProfiles,
} from '@/drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { redirect }       from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { VendorOrdersClient } from '@/components/vendor/vendor-orders-client';

async function getVendorOrders(userId: string, status?: string) {
  const vendor = await db
    .select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);

  if (!vendor.length) return null;

  const conditions = [eq(ordersTable.vendorId, vendor[0].id)];
  if (status && status !== 'ALL') {
    conditions.push(eq(ordersTable.orderStatus, status as any));
  }

  const rows = await db
    .select({
      id:            ordersTable.id,
      orderStatus:   ordersTable.orderStatus,
      paymentStatus: ordersTable.paymentStatus,
      totalAmount:   ordersTable.totalAmount,
      vendorEarnings: ordersTable.vendorEarnings,
      quantity:      ordersTable.quantity,
      customerName:  ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      customerEmail: ordersTable.customerEmail,
      city:          ordersTable.city,
      address:       ordersTable.address,
      notes:         ordersTable.notes,
      createdAt:     ordersTable.createdAt,
      productTitle:  products.title,
      productImage:  products.mainImageUrl,
      productSlug:   products.slug,
    })
    .from(ordersTable)
    .leftJoin(products, eq(ordersTable.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(ordersTable.createdAt))
    .limit(100);

  return { vendor: vendor[0], orders: rows };
}

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth   = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const { status } = await searchParams;
  const data = await getVendorOrders(auth.sub, status);
  if (!data) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={data.vendor.shopName}>
      <VendorOrdersClient
        orders={data.orders.map((o) => ({
          ...o,
          totalAmount:    parseFloat(o.totalAmount),
          vendorEarnings: parseFloat(o.vendorEarnings ?? '0'),
          createdAt:      o.createdAt.toISOString(),
          productTitle:   o.productTitle ?? '',
          productImage:   o.productImage ?? null,
          productSlug:    o.productSlug  ?? '',
          city:           o.city         ?? null,
          address:        o.address      ?? null,
          notes:          o.notes        ?? null,
          customerEmail:  o.customerEmail ?? null,
        }))}
        activeStatus={status ?? 'ALL'}
      />
    </DashboardShell>
  );
}
