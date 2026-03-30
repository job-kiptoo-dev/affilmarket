import { unstable_noStore as noStore } from 'next/cache';
import { redirect }                    from 'next/navigation';
import { getAuthUser }                 from '@/lib/healpers/auth-server';
import { getVendorPayoutsData }        from '@/action/vendorPayoutAction';
import { DashboardShell }              from '@/components/dashboard/dashboard-shell';
import { VendorPayoutsClient }         from '@/components/vendor/vendor-payouts-client';

export default async function VendorEarningsPage() {
  noStore();
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getVendorPayoutsData();
  if (data.profileIncomplete) redirect('/vendor/onboarding');

  return (
    <DashboardShell role="VENDOR" vendorName={ auth.name }>
      <VendorPayoutsClient data={data} />
    </DashboardShell>
  );
}
