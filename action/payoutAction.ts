'use server';

import { db } from '@/lib/utils/db';
import {
  payoutRequests, balances, vendorProfiles, affiliateProfiles, users,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { z } from 'zod';

const PayoutSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['MPESA', 'BANK']),
  mpesaPhone: z.string().optional().nullable(),
});

export async function requestPayout(payload: unknown) {
  const auth = await getAuthUser();
  if (!auth) return { error: 'Unauthorized' };

  const parsed = PayoutSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.message };

  const { amount, method, mpesaPhone } = parsed.data;

  // Get balance
  const balance = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, auth.sub))
    .limit(1);

  if (!balance.length) return { error: 'No balance record found' };

  const available = parseFloat(balance[0].availableBalance ?? '0');

  // Fetch minimum threshold from settings
  const minThreshold = auth.role === 'VENDOR' ? 500 : 200;

  if (available < minThreshold) {
    return { error: `Minimum payout is KES ${minThreshold}. Your balance is KES ${available}` };
  }

  if (amount > available) {
    return { error: `Amount exceeds available balance of KES ${available}` };
  }

  // Determine role
  const role = auth.role === 'AFFILIATE' ? 'AFFILIATE' : 'VENDOR';

  // Get their saved M-Pesa number if not provided
  let resolvedPhone = mpesaPhone;
  if (!resolvedPhone && method === 'MPESA') {
    if (role === 'VENDOR') {
      const vendor = await db
        .select({ phone: vendorProfiles.phone })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.userId, auth.sub))
        .limit(1);
      resolvedPhone = vendor[0]?.phone ?? null;
    } else {
      const aff = await db
        .select({ mpesaPhone: affiliateProfiles.mpesaPhone })
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.userId, auth.sub))
        .limit(1);
      resolvedPhone = aff[0]?.mpesaPhone ?? null;
    }
  }

  if (method === 'MPESA' && !resolvedPhone) {
    return { error: 'No M-Pesa number on file. Please update your profile.' };
  }

  // Deduct from available balance immediately (hold it)
  await db.update(balances)
    .set({
      availableBalance: String(available - amount),
    })
    .where(eq(balances.userId, auth.sub));

  // Create payout request
  await db.insert(payoutRequests).values({
    id:      crypto.randomUUID(),
    userId:  auth.sub,
    role,
    amount:  String(amount),
    method,
    status:  'REQUESTED',
  });

  return { success: true };
}
