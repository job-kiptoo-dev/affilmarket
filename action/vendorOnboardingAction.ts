'use server';

// import { db }             from '@/lib/db';
import { vendorProfiles } from '@/drizzle/schema';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { db } from '@/lib/utils/db';
import { eq }             from 'drizzle-orm';
// import { getAuthUser }    from '@/lib/auth-server';
import { z }              from 'zod';

const OnboardingSchema = z.object({
  shopName:    z.string().min(2, 'Shop name is required').max(100),
  legalName:   z.string().max(100).optional().nullable(),
  phone:       z.string().max(20).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  kraPin:      z.string().max(20).optional().nullable(),
  kraPinDoc:   z.string().optional().nullable(),
  logoUrl:     z.string().optional().nullable(),
  city:        z.string().max(100).optional().nullable(),
  address:     z.string().max(200).optional().nullable(),
});

export async function submitVendorOnboarding(formData: unknown) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

  const parsed = OnboardingSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { shopName, legalName, phone, description, kraPin, kraPinDoc, logoUrl, city, address } = parsed.data;

  const existing = await db
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (existing.length) return { error: 'Already onboarded' };

  await db.insert(vendorProfiles).values({
    id:          crypto.randomUUID(),
    userId:      auth.sub,
    shopName,
    legalName:   legalName   ?? null,
    phone:       phone       ?? null,
    description: description ?? null,
    kraPin:      kraPin      ?? null,
    kraPinDoc:   kraPinDoc   ?? null,
    logoUrl:     logoUrl     ?? null,
    shopAddress: city || address ? { city, address } : null,
    status:      'pending',
  });

  return { success: true };
}
