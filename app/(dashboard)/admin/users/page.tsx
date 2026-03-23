import { getAuthUser }    from '@/lib/healpers/auth-server';
import { db }             from '@/lib/utils/db';
import {
  users, vendorProfiles, affiliateProfiles, orders, balances,
} from '@/drizzle/schema';
import { eq, desc, sql }  from 'drizzle-orm';
import { redirect }       from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AdminUsersClient } from '@/components/admin/admin-users-client';

async function getUsers(role?: string, status?: string) {
  const rows = await db
    .select({
      id:            users.id,
      name:          users.name,
      email:         users.email,
      phone:         users.phone,
      role:          users.role,
      status:        users.status,
      emailVerified: users.emailVerified,
      createdAt:     users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);

  const filtered = rows.filter(u => {
    if (role   && role   !== 'ALL' && u.role   !== role)   return false;
    if (status && status !== 'ALL' && u.status !== status) return false;
    return true;
  });

  // Enrich with profile data
  const enriched = await Promise.all(filtered.map(async (u) => {
    let shopName:       string | null = null;
    let affiliateToken: string | null = null;
    let idNumber:       string | null = null;
    let kraPin:         string | null = null;
    let orderCount = 0;
    let balance    = 0;

    // if (u.role === 'VENDOR' || u.role === 'BOTH') {
    //   const vendor = await db
    //     .select({
    //       id:        vendorProfiles.id,
    //       shopName:  vendorProfiles.shopName,
    //       kraPin:    vendorProfiles.kraPin,
    //       vstatus:   vendorProfiles.status,
    //     })
    //     .from(vendorProfiles)
    //     .where(eq(vendorProfiles.userId, u.id))
    //     .limit(1);
    //
    //   shopName = vendor[0]?.shopName ?? null;
    //   kraPin   = vendor[0]?.kraPin   ?? null;
    //
    //   const oc = await db
    //     .select({ count: sql<number>`count(*)::int` })
    //     .from(orders)
    //     .where(eq(orders.vendorId, u.id));
    //
    //   orderCount = oc[0]?.count ?? 0;
    // }
    

if (u.role === 'VENDOR' || u.role === 'BOTH') {
  const vendor = await db
    .select({
      id:        vendorProfiles.id,
      shopName:  vendorProfiles.shopName,
      kraPin:    vendorProfiles.kraPin,
      vstatus:   vendorProfiles.status,
    })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, u.id))
    .limit(1);

  shopName = vendor[0]?.shopName ?? null;
  kraPin   = vendor[0]?.kraPin   ?? null;

  const vendorId = vendor[0]?.id;

  if (vendorId) {
    const oc = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(eq(orders.vendorId, vendorId));

    orderCount = oc[0]?.count ?? 0;
  }
}
    if (u.role === 'AFFILIATE' || u.role === 'BOTH') {
      const aff = await db
        .select({
          affiliateToken: affiliateProfiles.affiliateToken,
          idNumber:       affiliateProfiles.idNumber,
        })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.userId, u.id))
        .limit(1);

      affiliateToken = aff[0]?.affiliateToken ?? null;
      idNumber       = aff[0]?.idNumber       ?? null;
    }

    const bal = await db
      .select({ available: balances.availableBalance })
      .from(balances)
      .where(eq(balances.userId, u.id))
      .limit(1);

    balance = parseFloat(bal[0]?.available ?? '0');

    return {
      ...u,
      createdAt: u.createdAt.toISOString(),
      shopName,
      affiliateToken,
      idNumber,
      kraPin,
      orderCount,
      balance,
    };
  }));

  return enriched;
}

async function getCounts() {
  const all = await db
    .select({ role: users.role, status: users.status })
    .from(users);

  return {
    ALL:       all.length,
    VENDOR:    all.filter(u => u.role === 'VENDOR').length,
    AFFILIATE: all.filter(u => u.role === 'AFFILIATE').length,
    BOTH:      all.filter(u => u.role === 'BOTH').length,
    ADMIN:     all.filter(u => u.role === 'ADMIN').length,
    active:    all.filter(u => u.status === 'active').length,
    suspended: all.filter(u => u.status === 'suspended').length,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') redirect('/login');

  const { role, status } = await searchParams;

  const [userList, counts] = await Promise.all([
    getUsers(role, status),
    getCounts(),
  ]);

  return (
    <DashboardShell role="ADMIN" vendorName={auth.name}>
      <AdminUsersClient
        users={userList}
        activeRole={role   ?? 'ALL'}
        activeStatus={status ?? 'ALL'}
        counts={counts}
      />
    </DashboardShell>
  );
}
