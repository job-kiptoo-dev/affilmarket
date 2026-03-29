import { redirect }       from 'next/navigation';
import { vendorProfiles } from '@/drizzle/schema';
import { eq }             from 'drizzle-orm';
import { VendorOnboardingForm } from '@/components/vendor/vendor-onboarding-form';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { db } from '@/lib/utils/db';




export default async function VendorOnboardingPage() {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  const existing = await db
    .select({ id: vendorProfiles.id, isOnboarded: vendorProfiles.isOnboarded }) // ✅ add isOnboarded
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (existing.length && existing[0].isOnboarded) redirect('/vendor'); // ✅ only redirect if fully onboarded

  return <VendorOnboardingForm />;
}



// export default async function VendorOnboardingPage() {
//   const auth = await getAuthUser();
//   if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');
//
//   const existing = await db
//     .select({ id: vendorProfiles.id })
//     .from(vendorProfiles)
//     .where(eq(vendorProfiles.userId, auth.sub))
//     .limit(1);
//
//   if (existing.length) redirect('/vendor');
//
//   return <VendorOnboardingForm />;
// }
