import { redirect }          from 'next/navigation';
import { getAuthUser }       from '@/lib/healpers/auth-server';
import { db }                from '@/lib/utils/db';
import { affiliateProfiles } from '@/drizzle/schema';
import { eq }                from 'drizzle-orm';
import { AffiliateOnboardingForm } from '@/components/affiliate/affiliate-onboarding-form';

export default async function AffiliateOnboardingPage() {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) redirect('/login');

  // Already onboarded → go to dashboard
  const existing = await db
    .select({ id: affiliateProfiles.id })
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, auth.sub))
    .limit(1);

  if (existing.length) redirect('/affiliate');

  return <AffiliateOnboardingForm />;
}
