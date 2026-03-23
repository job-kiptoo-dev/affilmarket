'use server';

import { db }             from '@/lib/utils/db';
import { payoutRequests, balances } from '@/drizzle/schema';
import { eq }             from 'drizzle-orm';
import { getAuthUser }    from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';
import { stkPush }        from '@/lib/mpesa';

export async function approvePayoutRequest(payoutId: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db.update(payoutRequests)
    .set({ status: 'APPROVED' })
    .where(eq(payoutRequests.id, payoutId));

  revalidatePath('/admin/payouts');
  return { success: true };
}

export async function rejectPayoutRequest(payoutId: string, adminNote: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  // Fetch payout to restore balance
  const payout = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutId))
    .limit(1);

  if (!payout.length) return { error: 'Payout not found' };

  const p = payout[0];

  // Restore the held balance back to available
  const balance = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, p.userId))
    .limit(1);

  if (balance.length) {
    const current = parseFloat(balance[0].availableBalance ?? '0');
    await db.update(balances)
      .set({ availableBalance: String(current + parseFloat(p.amount)) })
      .where(eq(balances.userId, p.userId));
  }

  await db.update(payoutRequests)
    .set({ status: 'REJECTED', adminNote })
    .where(eq(payoutRequests.id, payoutId));

  revalidatePath('/admin/payouts');
  return { success: true };
}

export async function processPayoutViaMpesa(
  payoutId:  string,
  phone:     string,
  amount:    number,
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  try {
    const result = await stkPush({
      phone,
      amount,
      orderId: payoutId,
    });

    if (result.error) return { error: result.error };

    await db.update(payoutRequests)
      .set({
        status:    'PAID',
        adminNote: `M-Pesa B2C sent to ${phone}`,
      })
      .where(eq(payoutRequests.id, payoutId));

    // Update paidOutTotal
    const payout = await db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, payoutId))
      .limit(1);

    if (payout.length) {
      const balance = await db
        .select()
        .from(balances)
        .where(eq(balances.userId, payout[0].userId))
        .limit(1);

      if (balance.length) {
        await db.update(balances)
          .set({
            paidOutTotal: String(
              parseFloat(balance[0].paidOutTotal ?? '0') + amount
            ),
          })
          .where(eq(balances.userId, payout[0].userId));
      }
    }

    revalidatePath('/admin/payouts');
    return { success: true };
  } catch (err) {
    console.error('[processPayoutViaMpesa]', err);
    return { error: 'Failed to process payout' };
  }
}

export async function markPayoutPaid(payoutId: string, adminNote: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  const payout = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutId))
    .limit(1);

  if (!payout.length) return { error: 'Payout not found' };

  const p = payout[0];

  await db.update(payoutRequests)
    .set({ status: 'PAID', adminNote })
    .where(eq(payoutRequests.id, payoutId));

  // Update paidOutTotal
  const balance = await db
    .select()
    .from(balances)
    .where(eq(balances.userId, p.userId))
    .limit(1);

  if (balance.length) {
    await db.update(balances)
      .set({
        paidOutTotal: String(
          parseFloat(balance[0].paidOutTotal ?? '0') + parseFloat(p.amount)
        ),
      })
      .where(eq(balances.userId, p.userId));
  }

  revalidatePath('/admin/payouts');
  return { success: true };
}
