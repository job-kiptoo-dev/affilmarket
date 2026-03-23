import 'server-only';
import { db }                from '@/lib/utils/db';
import { affiliateProfiles } from '@/drizzle/schema';
import { eq }                from 'drizzle-orm';

export async function resolveAffiliateId(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;

  try {
    const aff = await db
      .select({ id: affiliateProfiles.id })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.affiliateToken, token))
      .limit(1);

    return aff.length ? aff[0].id : null;
  } catch {
    return null; // never break the page
  }
}
