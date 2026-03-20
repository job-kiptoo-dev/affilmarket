'use server';

import { db }                from '@/lib/utils/db';
import { affiliateProfiles, balances } from '@/drizzle/schema';
import { eq }                from 'drizzle-orm';
import { getAuthUser }       from '@/lib/healpers/auth-server';
import { generateAffiliateToken } from '@/lib/utils';
import { z }                 from 'zod';

const OnboardingSchema = z.object({
  fullName:          z.string().min(2, 'Full name is required').max(100),
  phone:             z.string().min(9, 'Phone number is required').max(20),
  idNumber:          z.string().max(20).optional().nullable(),
  payoutMethod:      z.enum(['MPESA', 'BANK']).default('MPESA'),
  mpesaPhone:        z.string().max(20).optional().nullable(),
  bankName:          z.string().max(100).optional().nullable(),
  bankAccountName:   z.string().max(100).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  niche:             z.string().max(200).optional().nullable(),
  socialLinks:       z.string().max(500).optional().nullable(),
});

export async function submitAffiliateOnboarding(formData: unknown) {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

  const parsed = OnboardingSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const {
    fullName, phone, idNumber, payoutMethod,
    mpesaPhone, bankName, bankAccountName, bankAccountNumber,
  } = parsed.data;

  // Already onboarded?
  const existing = await db
    .select({ id: affiliateProfiles.id })
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, auth.sub))
    .limit(1);

  if (existing.length) return { error: 'Already onboarded' };

  if (payoutMethod === 'MPESA' && !mpesaPhone && !phone) {
    return { error: 'M-Pesa phone number is required for M-Pesa payouts' };
  }

  if (payoutMethod === 'BANK' && (!bankName || !bankAccountNumber)) {
    return { error: 'Bank name and account number are required for bank payouts' };
  }

  const affiliateId = crypto.randomUUID();

  await db.insert(affiliateProfiles).values({
    id:                affiliateId,
    userId:            auth.sub,
    fullName,
    phone,
    idNumber:          idNumber          ?? null,
    affiliateToken:    generateAffiliateToken(),
    payoutMethod,
    mpesaPhone:        mpesaPhone        ?? phone, // default to main phone
    bankName:          bankName          ?? null,
    bankAccountName:   bankAccountName   ?? null,
    bankAccountNumber: bankAccountNumber ?? null,
    status:            'active', // affiliates go live immediately
  });

  // Create balance record
  await db.insert(balances).values({
    id:               crypto.randomUUID(),
    userId:           auth.sub,
    pendingBalance:   '0',
    availableBalance: '0',
    paidOutTotal:     '0',
  });

  return { success: true };
}
