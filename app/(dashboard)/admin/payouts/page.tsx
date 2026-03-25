// import { getAuthUser }    from '@/lib/healpers/auth-server';
// import { db }             from '@/lib/db';

export const dynamic = 'force-dynamic';


import {
  payoutRequests, users, vendorProfiles, affiliateProfiles, balances,
} from '@/drizzle/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { redirect }       from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AdminPayoutsClient } from '@/components/admin/admin-payouts-client';
import { db } from '@/lib/utils/db';
import { getAuthUser } from '@/lib/healpers/auth-server';

async function getPayouts(status?: string) {
  const conditions = status && status !== 'ALL'
    ? [eq(payoutRequests.status, status as any)]
    : [];

  const rows = await db
    .select({
      id:        payoutRequests.id,
      userId:    payoutRequests.userId,
      role:      payoutRequests.role,
      amount:    payoutRequests.amount,
      method:    payoutRequests.method,
      status:    payoutRequests.status,
      adminNote: payoutRequests.adminNote,
      createdAt: payoutRequests.createdAt,
      userName:  users.name,
      userEmail: users.email,
    })
    .from(payoutRequests)
    .leftJoin(users, eq(payoutRequests.userId, users.id))
    .where(conditions.length ? conditions[0] : undefined)
    .orderBy(desc(payoutRequests.createdAt))
    .limit(100);

  // Fetch payout phone/bank for each request
  const enriched = await Promise.all(rows.map(async (r) => {
    if (r.role === 'VENDOR') {
      const vendor = await db
        .select({ phone: vendorProfiles.phone, shopName: vendorProfiles.shopName })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.userId, r.userId))
        .limit(1);
      return {
        ...r,
        payoutPhone: vendor[0]?.phone ?? null,
        shopName:    vendor[0]?.shopName ?? null,
        bankName:    null,
        bankAccount: null,
      };
    } else {
      const aff = await db
        .select({
          mpesaPhone:        affiliateProfiles.mpesaPhone,
          bankName:          affiliateProfiles.bankName,
          bankAccountNumber: affiliateProfiles.bankAccountNumber,
          bankAccountName:   affiliateProfiles.bankAccountName,
        })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.userId, r.userId))
        .limit(1);
      return {
        ...r,
        payoutPhone: aff[0]?.mpesaPhone        ?? null,
        shopName:    null,
        bankName:    aff[0]?.bankName           ?? null,
        bankAccount: aff[0]?.bankAccountNumber  ?? null,
      };
    }
  }));

  return enriched;
}

async function getCounts() {
  const all = await db.select({ status: payoutRequests.status }).from(payoutRequests);
  return {
    ALL:       all.length,
    REQUESTED: all.filter(r => r.status === 'REQUESTED').length,
    APPROVED:  all.filter(r => r.status === 'APPROVED').length,
    PAID:      all.filter(r => r.status === 'PAID').length,
    REJECTED:  all.filter(r => r.status === 'REJECTED').length,
  };
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') redirect('/login');

  const { status } = await searchParams;
  const [payouts, counts] = await Promise.all([
    getPayouts(status ?? 'REQUESTED'),
    getCounts(),
  ]);

  return (
    <DashboardShell role="ADMIN" vendorName={auth.name} >
      <AdminPayoutsClient
        payouts={payouts.map(p => ({
          ...p,
          amount:    parseFloat(p.amount),
          createdAt: p.createdAt.toISOString(),
        }))}
        activeStatus={status ?? 'REQUESTED'}
        counts={counts}
      />
    </DashboardShell>
  );
}
