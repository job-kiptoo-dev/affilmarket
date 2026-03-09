/**
 * AffilMarket Kenya — Commission Engine
 * All amounts in KES (Decimal/number).
 * This module is the single source of truth for commission math.
 * Commissions are computed ONCE after verified payment and stored immutably.
 */

import { prisma } from './prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface CommissionResult {
  platformFee: number;
  affiliateCommission: number;
  vendorEarnings: number;
  platformRevenue: number;
}

export interface CommissionParams {
  totalAmount: number;
  affiliateCommissionRate: number; // e.g. 0.10 for 10%
  platformFeeRate: number;         // e.g. 0.05 for 5%
  platformFixedFee: number;        // e.g. 10 KES
  hasAffiliate: boolean;
}

/**
 * Case A: With affiliate
 *   platform_fee = P * rp + fp
 *   affiliate_commission = P * ra
 *   vendor_earnings = P - platform_fee - affiliate_commission
 *   platform_revenue = platform_fee
 *
 * Case B: No affiliate
 *   platform_fee = P * rp + fp
 *   platform_extra = P * ra  (platform keeps affiliate commission)
 *   vendor_earnings = P - platform_fee - platform_extra
 *   platform_revenue = platform_fee + platform_extra
 */
export function computeCommissions(params: CommissionParams): CommissionResult {
  const {
    totalAmount: P,
    affiliateCommissionRate: ra,
    platformFeeRate: rp,
    platformFixedFee: fp,
    hasAffiliate,
  } = params;

  // Round to 2 decimal places throughout
  const round = (n: number) => Math.round(n * 100) / 100;

  const platformFee = round(P * rp + fp);
  const affiliateSlice = round(P * ra);

  if (hasAffiliate) {
    // Case A
    const vendorEarnings = round(P - platformFee - affiliateSlice);
    return {
      platformFee,
      affiliateCommission: affiliateSlice,
      vendorEarnings: Math.max(0, vendorEarnings),
      platformRevenue: platformFee,
    };
  } else {
    // Case B — platform keeps affiliate share
    const vendorEarnings = round(P - platformFee - affiliateSlice);
    return {
      platformFee,
      affiliateCommission: 0,
      vendorEarnings: Math.max(0, vendorEarnings),
      platformRevenue: round(platformFee + affiliateSlice),
    };
  }
}

/**
 * Load platform settings from DB
 */
export async function getPlatformSettings() {
  const settings = await prisma.platformSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return {
    platformFeeRate: parseFloat(map.platform_fee_rate ?? '0.05'),
    platformFixedFee: parseFloat(map.platform_fixed_fee ?? '10'),
    minPayoutThresholdVendor: parseFloat(map.min_payout_threshold_vendor ?? '500'),
    minPayoutThresholdAffiliate: parseFloat(map.min_payout_threshold_affiliate ?? '200'),
    affiliateCookieDays: parseInt(map.affiliate_cookie_days ?? '30'),
    balanceReleaseDays: parseInt(map.balance_release_days ?? '7'),
  };
}

/**
 * Compute and persist commissions for a paid order.
 * This should only be called once per order (idempotent check included).
 */
export async function computeAndSaveCommissions(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { product: true, affiliate: true },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.commissionsComputed) {
      console.log(`Commissions already computed for order ${orderId}`);
      return;
    }

    const settings = await getPlatformSettings();

    const result = computeCommissions({
      totalAmount: order.totalAmount.toNumber(),
      affiliateCommissionRate: order.product.affiliateCommissionRate.toNumber(),
      platformFeeRate: settings.platformFeeRate,
      platformFixedFee: settings.platformFixedFee,
      hasAffiliate: !!order.affiliateId,
    });

    // Update order with computed values
    await tx.order.update({
      where: { id: orderId },
      data: {
        platformFee: result.platformFee,
        affiliateCommission: result.affiliateCommission,
        vendorEarnings: result.vendorEarnings,
        platformRevenue: result.platformRevenue,
        commissionsComputed: true,
      },
    });

    // Credit vendor pending balance
    await tx.balance.upsert({
      where: { userId: order.product.vendorId },
      create: {
        userId: order.product.vendorId,
        pendingBalance: result.vendorEarnings,
      },
      update: {
        pendingBalance: { increment: result.vendorEarnings },
      },
    });

    // Credit affiliate pending balance (if applicable)
    if (order.affiliateId && result.affiliateCommission > 0) {
      const affiliate = await tx.affiliateProfile.findUnique({
        where: { id: order.affiliateId },
      });
      if (affiliate) {
        await tx.balance.upsert({
          where: { userId: affiliate.userId },
          create: {
            userId: affiliate.userId,
            pendingBalance: result.affiliateCommission,
          },
          update: {
            pendingBalance: { increment: result.affiliateCommission },
          },
        });
      }
    }

    console.log(`✅ Commissions computed for order ${orderId}:`, result);
  });
}

/**
 * Release pending balances to available for delivered orders.
 * Called by a scheduled job.
 */
export async function releasePendingBalances(): Promise<number> {
  const settings = await getPlatformSettings();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.balanceReleaseDays);

  const eligibleOrders = await prisma.order.findMany({
    where: {
      OR: [
        { orderStatus: 'DELIVERED' },
        {
          paymentStatus: 'PAID',
          createdAt: { lte: cutoffDate },
        },
      ],
      commissionsComputed: true,
      balancesReleased: false,
    },
    include: { product: true },
  });

  let releasedCount = 0;

  for (const order of eligibleOrders) {
    await prisma.$transaction(async (tx) => {
      // Release vendor balance
      if (order.vendorEarnings && order.vendorEarnings.toNumber() > 0) {
        await tx.balance.update({
          where: { userId: order.product.vendorId },
          data: {
            pendingBalance: { decrement: order.vendorEarnings.toNumber() },
            availableBalance: { increment: order.vendorEarnings.toNumber() },
          },
        });
      }

      // Release affiliate balance
      if (order.affiliateId && order.affiliateCommission && order.affiliateCommission.toNumber() > 0) {
        const affiliate = await tx.affiliateProfile.findUnique({
          where: { id: order.affiliateId },
        });
        if (affiliate) {
          await tx.balance.update({
            where: { userId: affiliate.userId },
            data: {
              pendingBalance: { decrement: order.affiliateCommission.toNumber() },
              availableBalance: { increment: order.affiliateCommission.toNumber() },
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { balancesReleased: true },
      });
    });

    releasedCount++;
  }

  return releasedCount;
}
