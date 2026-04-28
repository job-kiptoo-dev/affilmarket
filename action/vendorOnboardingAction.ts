'use server';
import { vendorProfiles } from '@/drizzle/schema';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { db } from '@/lib/utils/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

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
  county:      z.string().optional().nullable(), // ← add
  postalCode:  z.string().optional().nullable(), // ← add
});

export async function submitVendorOnboarding(formData: unknown) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

  const parsed = OnboardingSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.message };

  const { shopName, legalName, phone, description, kraPin, kraPinDoc, logoUrl, city, address } = parsed.data;

  // Only include fields that have actual values
  const payload = {
    shopName,
    isOnboarded: true,
    status: 'pending' as const,
    ...(legalName   && { legalName }),
    ...(phone       && { phone }),
    ...(description && { description }),
    ...(kraPin      && { kraPin }),
    ...(kraPinDoc   && { kraPinDoc }),
    ...(logoUrl     && { logoUrl }),
    ...((city || address) && { shopAddress: { city, address } }),
  };

  const updated = await db
    .update(vendorProfiles)
    .set(payload)
    .where(eq(vendorProfiles.userId, auth.sub))
    .returning({ id: vendorProfiles.id });

  if (!updated.length) {
    await db.insert(vendorProfiles).values({
      userId: auth.sub,
      ...payload,
    });
  }

  return { success: true };
}


// 'use server';
//
// // import { db }             from '@/lib/db';
// import { vendorProfiles } from '@/drizzle/schema';
// import { getAuthUser } from '@/lib/healpers/auth-server';
// import { db } from '@/lib/utils/db';
// import { eq }             from 'drizzle-orm';
// // import { getAuthUser }    from '@/lib/auth-server';
// import { z }              from 'zod';
//
// const OnboardingSchema = z.object({
//   shopName:    z.string().min(2, 'Shop name is required').max(100),
//   legalName:   z.string().max(100).optional().nullable(),
//   phone:       z.string().max(20).optional().nullable(),
//   description: z.string().max(1000).optional().nullable(),
//   kraPin:      z.string().max(20).optional().nullable(),
//   kraPinDoc:   z.string().optional().nullable(),
//   logoUrl:     z.string().optional().nullable(),
//   city:        z.string().max(100).optional().nullable(),
//   address:     z.string().max(200).optional().nullable(),
// });
//
// export async function submitVendorOnboarding(formData: unknown) {
//   const auth = await getAuthUser();
//   if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
//     return { error: 'Unauthorized' };
//   }
//
//   const parsed = OnboardingSchema.safeParse(formData);
//   if (!parsed.success) return { error: parsed.error.message };
//
//   const { shopName, legalName, phone, description, kraPin, kraPinDoc, logoUrl, city, address } = parsed.data;
//
//   // ✅ UPDATE the existing row (created at signup) instead of inserting
//   await db
//     .update(vendorProfiles)
//     .set({
//       shopName,
//       legalName:    legalName   ?? null,
//       phone:        phone       ?? null,
//       description:  description ?? null,
//       kraPin:       kraPin      ?? null,
//       kraPinDoc:    kraPinDoc   ?? null,
//       logoUrl:      logoUrl     ?? null,
//       shopAddress:  city || address ? { city, address } : null,
//       status:       'pending',
//       isOnboarded:  true,        // ✅ marks onboarding as complete
//     })
//     .where(eq(vendorProfiles.userId, auth.sub));
//
//   return { success: true };
// }
//

// export async function submitVendorOnboarding(formData: unknown) {
//   const auth = await getAuthUser();
//   if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
//     return { error: 'Unauthorized' };
//   }
//
//   const parsed = OnboardingSchema.safeParse(formData);
//   if (!parsed.success) return { error: parsed.error.message };
//
//   const { shopName, legalName, phone, description, kraPin, kraPinDoc, logoUrl, city, address } = parsed.data;
//
//   const existing = await db
//     .select({ id: vendorProfiles.id })
//     .from(vendorProfiles)
//     .where(eq(vendorProfiles.userId, auth.sub))
//     .limit(1);
//
//   if (existing.length) return { error: 'Already onboarded' };
//
//   await db.insert(vendorProfiles).values({
//     id:          crypto.randomUUID(),
//     userId:      auth.sub,
//     shopName,
//     legalName:   legalName   ?? null,
//     phone:       phone       ?? null,
//     description: description ?? null,
//     kraPin:      kraPin      ?? null,
//     kraPinDoc:   kraPinDoc   ?? null,
//     logoUrl:     logoUrl     ?? null,
//     shopAddress: city || address ? { city, address } : null,
//     status:      'pending',
//   });
//
//   return { success: true };
// }
