'use server';

import { getAuthUser }    from '@/lib/healpers/auth-server';
import { db }             from '@/lib/utils/db';
import {
  vendorProfiles, balances, payoutRequests,
} from '@/drizzle/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { randomUUID }     from 'crypto';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PayoutMethod = 'MPESA' | 'BANK';
export type PayoutStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface PayoutRequest {
  id:        string;
  amount:    string;
  method:    PayoutMethod;
  status:    PayoutStatus;
  adminNote: string | null;
  createdAt: Date;
}

export interface VendorPayoutsPageData {
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
  profileIncomplete:  boolean;
}

// ─── GET page data ─────────────────────────────────────────────────────────────
export async function getVendorPayoutsData(): Promise<VendorPayoutsPageData> {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    throw new Error('Unauthorized');
  }

  const [profile] = await db
    .select()
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (!profile || !profile.isOnboarded) {
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
    .where(
      and(
        eq(payoutRequests.userId, auth.sub),
        eq(payoutRequests.role, 'VENDOR'),
      ),
    )
    .orderBy(desc(payoutRequests.createdAt))
    .limit(50);

  return {
    availableBalance:  parseFloat(balance?.availableBalance  ?? '0'),
    pendingBalance:    parseFloat(balance?.pendingBalance     ?? '0'),
    paidOutTotal:      parseFloat(balance?.paidOutTotal       ?? '0'),
    preferredMethod:   'MPESA',     // vendors currently use MPESA only
    mpesaPhone:        profile.phone ?? null,
    bankName:          null,        // extend later when you add bank to vendorProfiles
    bankAccountName:   null,
    bankAccountNumber: null,
    payoutHistory:     history as PayoutRequest[],
    hasPendingRequest: history.some(
      (r) => r.status === 'REQUESTED' || r.status === 'APPROVED',
    ),
    profileIncomplete: false,
  };
}

// ─── Submit payout request ─────────────────────────────────────────────────────
export async function requestVendorPayoutAction(
  amount: number,
  method: PayoutMethod,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthUser();
    if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
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
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, auth.sub))
      .limit(1);

    if (!profile || !profile.isOnboarded) {
      return { success: false, error: 'Complete your vendor profile before requesting a payout.' };
    }

    if (method === 'MPESA' && !profile.phone) {
      return { success: false, error: 'No M-Pesa number on your profile. Update your profile first.' };
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

    // Check no existing pending request
    const existing = await db
      .select({ id: payoutRequests.id })
      .from(payoutRequests)
      .where(
        and(
          eq(payoutRequests.userId, auth.sub),
          eq(payoutRequests.role,   'VENDOR'),
          inArray(payoutRequests.status, ['REQUESTED', 'APPROVED']),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'You already have a pending payout. Wait for it to be processed.' };
    }

    // Deduct from available balance immediately
    await db
      .update(balances)
      .set({ availableBalance: (available - amount).toFixed(2) })
      .where(eq(balances.userId, auth.sub));

    // Insert payout request
    await db.insert(payoutRequests).values({
      id:        randomUUID(),
      userId:    auth.sub,
      role:      'VENDOR',
      amount:    amount.toFixed(2),
      method,
      status:    'REQUESTED',
      adminNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath('/vendor/earnings');
    return { success: true };
  } catch (err: any) {
    console.error('[requestVendorPayoutAction]', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
