'use server';

import { getAuthUser }  from '@/lib/healpers/auth-server';
import { db }           from '@/lib/utils/db';
import {
  affiliateProfiles,
  balances,
  payoutRequests,
} from '@/drizzle/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PayoutMethod = 'MPESA' | 'BANK';
export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface PayoutRequest {
  id: string;
  amount: string;
  method: PayoutMethod;
  status: PayoutStatus;
  adminNote: string | null;
  createdAt: Date;
}

export interface PayoutsPageData {
  availableBalance:   number;
  pendingBalance:     number;
  paidOutTotal:       number;
  preferredMethod:    PayoutMethod;
  mpesaPhone:         string | null;
  bankName:           string | null;
  bankAccountName:    string | null;
  bankAccountNumber:  string | null;
  payoutHistory:      PayoutRequest[];
  hasPendingRequest:  boolean;
  profileIncomplete:  boolean;   // true when affiliate profile doesn't exist yet
}

// ─── GET page data ────────────────────────────────────────────────────────────
export async function getPayoutsData(): Promise<PayoutsPageData> {
  const auth = await getAuthUser();
  if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) {
    throw new Error('Unauthorized');
  }

  const [profile] = await db
    .select()
    .from(affiliateProfiles)
    .where(eq(affiliateProfiles.userId, auth.sub))
    .limit(1);

  // Profile row doesn't exist yet — return safe defaults so the page can
  // render and prompt the user to complete setup instead of throwing a 500.
  if (!profile) {
    return {
      availableBalance:  0,
      pendingBalance:    0,
      paidOutTotal:      0,
      preferredMethod:   'MPESA',
      mpesaPhone:        null,
      bankName:          null,
      bankAccountName:   null,
      bankAccountNumber: null,
      payoutHistory:     [],
      hasPendingRequest: false,
      profileIncomplete: true,
    };
  }

  const [balance] = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, auth.sub))
    .limit(1);

  const history = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.userId, auth.sub))
    .orderBy(desc(payoutRequests.createdAt))
    .limit(50);

  return {
    availableBalance:  parseFloat(balance?.availableBalance  ?? '0'),
    pendingBalance:    parseFloat(balance?.pendingBalance    ?? '0'),
    paidOutTotal:      parseFloat(balance?.paidOutTotal      ?? '0'),
    preferredMethod:   (profile.payoutMethod ?? 'MPESA') as PayoutMethod,
    mpesaPhone:        profile.mpesaPhone        ?? null,
    bankName:          profile.bankName          ?? null,
    bankAccountName:   profile.bankAccountName   ?? null,
    bankAccountNumber: profile.bankAccountNumber ?? null,
    payoutHistory:     history as PayoutRequest[],
    hasPendingRequest: history.some(
      (r) => r.status === 'REQUESTED' || r.status === 'APPROVED',
    ),
    profileIncomplete: false,
  };
}

// ─── Submit payout request ────────────────────────────────────────────────────
export async function requestPayoutAction(
  amount: number,
  method: PayoutMethod,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthUser();
    if (!auth || !['AFFILIATE', 'BOTH', 'ADMIN'].includes(auth.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!amount || isNaN(amount) || amount < 100) {
      return { success: false, error: 'Minimum withdrawal amount is KES 100.' };
    }
    if (!['MPESA', 'BANK'].includes(method)) {
      return { success: false, error: 'Invalid payout method.' };
    }

    const [profile] = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, auth.sub))
      .limit(1);

    if (!profile) {
      return { success: false, error: 'Complete your affiliate profile before requesting a payout.' };
    }

    if (method === 'MPESA' && !profile.mpesaPhone) {
      return { success: false, error: 'No M-Pesa number on your profile. Update your profile first.' };
    }
    if (method === 'BANK' && !profile.bankAccountNumber) {
      return { success: false, error: 'No bank account on your profile. Update your profile first.' };
    }

    const [balance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, auth.sub))
      .limit(1);

    const available = parseFloat(balance?.availableBalance ?? '0');
    if (amount > available) {
      return { success: false, error: `Amount exceeds available balance of KES ${available.toFixed(2)}.` };
    }

    const existing = await db
      .select({ id: payoutRequests.id })
      .from(payoutRequests)
      .where(
        and(
          eq(payoutRequests.userId, auth.sub),
          inArray(payoutRequests.status, ['REQUESTED', 'APPROVED']),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'You already have a pending payout. Wait for it to be processed.' };
    }

    await db
      .update(balances)
      .set({ availableBalance: (available - amount).toFixed(2) })
      .where(eq(balances.userId, auth.sub));

    await db.insert(payoutRequests).values({
      id:        randomUUID(),
      userId:    auth.sub,
      role:      'AFFILIATE',
      amount:    amount.toFixed(2),
      method,
      status:    'REQUESTED',
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath('/affiliate/payouts');
    return { success: true };
  } catch (err: any) {
    console.error('[requestPayoutAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
