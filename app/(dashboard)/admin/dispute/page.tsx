
export const dynamic = 'force-dynamic';

import { db }              from '@/lib/utils/db';
import { disputeTickets, orders as ordersTable, users } from '@/drizzle/schema';
import { eq, desc }        from 'drizzle-orm';
import { redirect }        from 'next/navigation';
import { getAuthUser }     from '@/lib/healpers/auth-server';
import { DashboardShell }  from '@/components/dashboard/dashboard-shell';
import { AdminDisputesClient } from '@/components/admin/admin-dispute-client';
// import { AdminDisputesClient } from '@/components/admin/admin-disputes-client';

async function getDisputes() {
  return db
    .select({
      id:           disputeTickets.id,
      orderId:      disputeTickets.orderId,
      status:       disputeTickets.status,
      messages:     disputeTickets.messages,
      createdAt:    disputeTickets.createdAt,
      updatedAt:    disputeTickets.updatedAt,
      openedByName: users.name,
      customerName: ordersTable.customerName,
      totalAmount:  ordersTable.totalAmount,
    })
    .from(disputeTickets)
    .leftJoin(users,        eq(disputeTickets.openedById, users.id))
    .leftJoin(ordersTable,  eq(disputeTickets.orderId, ordersTable.id))
    .orderBy(desc(disputeTickets.createdAt))
    .limit(100);
}

export default async function AdminDisputesPage() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') redirect('/login');

  const rows = await getDisputes();

  const disputes = rows.map((d) => ({
    id:           d.id,
    orderId:      d.orderId,
    status:       d.status,
    messages:     (d.messages ?? []) as Array<{
      authorId: string; authorName: string;
      body: string; createdAt: string;
    }>,
    createdAt:    d.createdAt.toISOString(),
    updatedAt:    d.updatedAt.toISOString(),
    openedByName: d.openedByName ?? 'Admin',
    customerName: d.customerName ?? null,
    totalAmount:  d.totalAmount  ?? null,
  }));

  return (
    <DashboardShell role="ADMIN" vendorName={auth.name} >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-gray-500 mt-1">
            Internal case log for buyer–vendor complaints
          </p>
        </div>
        <AdminDisputesClient
          disputes={disputes}
          adminId={auth.sub}
          adminName={auth.name ?? 'Admin'}
        />
      </div>
    </DashboardShell>
  );
}
