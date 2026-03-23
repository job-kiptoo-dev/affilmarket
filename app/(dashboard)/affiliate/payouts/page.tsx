import { getAuthUser }    from '@/lib/healpers/auth-server';
import { redirect }       from 'next/navigation';
import { getPayoutsData } from '@/action/payoutRequest';
import { PayoutsClient }  from '@/components/affiliate/payoutClient';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function PayoutsPage() {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const data = await getPayoutsData();

  return (
    <DashboardShell role="AFFILIATE" vendorName={ auth.name }>
      <PayoutsClient data={data} />
    </DashboardShell>
  );
}
