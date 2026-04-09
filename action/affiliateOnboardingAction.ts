

'use server';

import { db }                     from '@/lib/utils/db';
import { affiliateProfiles, balances, users } from '@/drizzle/schema';
import { eq }                     from 'drizzle-orm';
import { getAuthUser }            from '@/lib/healpers/auth-server';
import { generateAffiliateToken } from '@/lib/utils';
import { z }                      from 'zod';

const OnboardingSchema = z.object({
  fullName:          z.string().min(2).max(100),
  phone:             z.string().min(9).max(20),
  idNumber:          z.string().max(20).optional().nullable(),
  payoutMethod:      z.enum(['MPESA', 'BANK']).default('MPESA'),
  mpesaPhone:        z.string().max(20).optional().nullable(),
  bankName:          z.string().max(100).optional().nullable(),
  
  bankAccountName:   z.string().max(100).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
});

export async function submitAffiliateOnboarding(formData: unknown) {
  const auth = await getAuthUser();
  if (!auth) return { error: 'Unauthorized' };

  if (!formData || typeof formData !== 'object') {
    return { error: 'Invalid form data received' };
  }

  const parsed = OnboardingSchema.safeParse(formData);
  if (!parsed.success) {
    // ← use flatten() instead of .message to avoid Object.entries crash
    const firstError = parsed.error.flatten().fieldErrors;
    const firstMessage = Object.values(firstError)[0]?.[0] ?? 'Invalid form data';
    return { error: firstMessage };
  }
  const {
    fullName, phone, idNumber, payoutMethod,
    mpesaPhone, bankName, bankAccountName, bankAccountNumber,
  } = parsed.data;

  // check existing — if already onboarded, stop
  const existing = await db
    .select({ id: affiliateProfiles.id, isOnboarded: affiliateProfiles.isOnboarded })
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, auth.sub))
    .limit(1);

  if (existing.length && existing[0].isOnboarded) {
    return { error: 'Already onboarded' };
  }

  // validations
  if (payoutMethod === 'MPESA' && !mpesaPhone && !phone) {
    return { error: 'MPESA phone required' };
  }
  if (payoutMethod === 'BANK' && (!bankName || !bankAccountNumber)) {
    return { error: 'Bank details required' };
  }

  // ── 1. Create affiliate profile ──
  await db.insert(affiliateProfiles).values({
    id:               crypto.randomUUID(),
    userId:           auth.sub,
    fullName,
    phone,
    idNumber:         idNumber ?? null,
    affiliateToken:   generateAffiliateToken(),
    payoutMethod,
    mpesaPhone:       mpesaPhone ?? phone,
    bankName:         bankName ?? null,
    bankAccountName:  bankAccountName ?? null,
    bankAccountNumber: bankAccountNumber ?? null,
    status:           'active',
    isOnboarded:      true,   // ← NEW
  })
.onConflictDoUpdate({
  target: affiliateProfiles.userId,  // ← if userId already exists
  set: {
    isOnboarded: true,
    status:      'active',
    fullName,
    phone,
    mpesaPhone:  mpesaPhone ?? phone,
  },
})
  ;

  // ── 2. Update user role ── ← NEW
  await db
    .update(users)
    .set({ role: 'AFFILIATE' })
    .where(eq(users.id, auth.sub));

  // ── 3. Create balance row at KES 0 ──
  await db
    .insert(balances)
    .values({
      id:               crypto.randomUUID(),
      userId:           auth.sub,
      pendingBalance:   '0.00',
      availableBalance: '0.00',
      paidOutTotal:     '0.00',
    })
    .onConflictDoNothing();

  return { success: true };
}


//
//
// 'use server';
//
// import { db }                    from '@/lib/utils/db';
// import { affiliateProfiles, balances, users } from '@/drizzle/schema';
// import { eq }                    from 'drizzle-orm';
// import { getAuthUser }           from '@/lib/healpers/auth-server';
// import { generateAffiliateToken } from '@/lib/utils';
// import { z }                     from 'zod';
//
// const OnboardingSchema = z.object({
//   fullName:          z.string().min(2).max(100),
//   phone:             z.string().min(9).max(20),
//   idNumber:          z.string().max(20).optional().nullable(),
//   payoutMethod:      z.enum(['MPESA', 'BANK']).default('MPESA'),
//   mpesaPhone:        z.string().max(20).optional().nullable(),
//   bankName:          z.string().max(100).optional().nullable(),
//   bankAccountName:   z.string().max(100).optional().nullable(),
//   bankAccountNumber: z.string().max(50).optional().nullable(),
// });
//
// export async function submitAffiliateOnboarding(formData: unknown) {
//   const auth = await getAuthUser();
//   if (!auth) return { error: 'Unauthorized' };
//
//   const parsed = OnboardingSchema.safeParse(formData);
//   if (!parsed.success) return { error: parsed.error.message };
//
//   const {
//     fullName, phone, idNumber, payoutMethod,
//     mpesaPhone, bankName, bankAccountName, bankAccountNumber,
//   } = parsed.data;
//
//   // check existing profile
//   const existing = await db
//     .select()
//     .from(affiliateProfiles)
//     .where(eq(affiliateProfiles.userId, auth.sub))
//     .limit(1);
//
//   if (existing.length) return { error: 'Already onboarded' };
//
//   // validations
//   if (payoutMethod === 'MPESA' && !mpesaPhone && !phone) {
//     return { error: 'MPESA phone required' };
//   }
//   if (payoutMethod === 'BANK' && (!bankName || !bankAccountNumber)) {
//     return { error: 'Bank details required' };
//   }
//
//   // ── 1. Create affiliate profile ──
//   await db.insert(affiliateProfiles).values({
//     id:               crypto.randomUUID(),
//     userId:           auth.sub,
//     fullName,
//     phone,
//     idNumber:         idNumber ?? null,
//     affiliateToken:   generateAffiliateToken(),
//     payoutMethod,
//     mpesaPhone:       mpesaPhone ?? phone,
//     bankName:         bankName ?? null,
//     bankAccountName:  bankAccountName ?? null,
//     bankAccountNumber: bankAccountNumber ?? null,
//     status:           'active',
//   });
//
//   // ── 2. Update user role to AFFILIATE ── ← NEW
//   await db
//     .update(users)
//     .set({ role: 'AFFILIATE' })
//     .where(eq(users.id, auth.sub));
//
//   // ── 3. Create balance row (starts at 0) ──
//   await db
//     .insert(balances)
//     .values({
//       id:               crypto.randomUUID(),
//       userId:           auth.sub,
//       pendingBalance:   '0.00',
//       availableBalance: '0.00',
//       paidOutTotal:     '0.00',
//     })
//     .onConflictDoNothing();
//
//   return { success: true };
// }



// 'use server';
//
// import { db } from '@/lib/utils/db';
// import { affiliateProfiles, balances } from '@/drizzle/schema';
// import { eq } from 'drizzle-orm';
// import { getAuthUser } from '@/lib/healpers/auth-server';
// import { generateAffiliateToken } from '@/lib/utils';
// import { z } from 'zod';
//
// const OnboardingSchema = z.object({
//   fullName: z.string().min(2).max(100),
//   phone: z.string().min(9).max(20),
//   idNumber: z.string().max(20).optional().nullable(),
//
//   payoutMethod: z.enum(['MPESA', 'BANK']).default('MPESA'),
//
//   mpesaPhone: z.string().max(20).optional().nullable(),
//
//   bankName: z.string().max(100).optional().nullable(),
//   bankAccountName: z.string().max(100).optional().nullable(),
//   bankAccountNumber: z.string().max(50).optional().nullable(),
// });
//
// export async function submitAffiliateOnboarding(formData: unknown) {
//   const auth = await getAuthUser();
//
//   if (!auth) {
//     return { error: 'Unauthorized' };
//   }
//
//   const parsed = OnboardingSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.message };
//   }
//
//   const {
//     fullName,
//     phone,
//     idNumber,
//     payoutMethod,
//     mpesaPhone,
//     bankName,
//     bankAccountName,
//     bankAccountNumber,
//   } = parsed.data;
//
//   // check existing profile
//   const existing = await db
//     .select()
//     .from(affiliateProfiles)
//     .where(eq(affiliateProfiles.userId, auth.sub))
//     .limit(1);
//
//   if (existing.length) {
//     return { error: 'Already onboarded' };
//   }
//
//   // validations
//   if (payoutMethod === 'MPESA' && !mpesaPhone && !phone) {
//     return { error: 'MPESA phone required' };
//   }
//
//   if (payoutMethod === 'BANK' && (!bankName || !bankAccountNumber)) {
//     return { error: 'Bank details required' };
//   }
//
//   // create profile
//   await db.insert(affiliateProfiles).values({
//     id: crypto.randomUUID(),
//     userId: auth.sub,
//     fullName,
//     phone,
//     idNumber: idNumber ?? null,
//
//     affiliateToken: generateAffiliateToken(),
//
//     payoutMethod,
//     mpesaPhone: mpesaPhone ?? phone,
//
//     bankName: bankName ?? null,
//     bankAccountName: bankAccountName ?? null,
//     bankAccountNumber: bankAccountNumber ?? null,
//
//     status: 'active',
//   });
//
//   // create balance (SAFE)
//   await db
//     .insert(balances)
//     .values({
//       id: crypto.randomUUID(),
//       userId: auth.sub,
//       pendingBalance: '0',
//       availableBalance: '0',
//       paidOutTotal: '0',
//     })
//     .onConflictDoNothing();
//
//   return { success: true };
// }
