import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/db';
import {
  orders,
  mpesaTransactions,
  balances,
  products,
  affiliateProfiles,
  vendorProfiles,
  users,
  platformSettings,
} from '@/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';
import { sendOrderConfirmationEmail } from '@/lib/resend';

// Safaricom IP whitelist
const SAFARICOM_IPS = [
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129',
  '196.201.212.136', '196.201.212.74',  '196.201.212.69',
];

export async function POST(req: NextRequest) {
  try {
    // ── IP whitelist check ─────────────────────────────
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('remote-addr') ??
      '';

    const isSandbox = process.env.MPESA_ENVIRONMENT !== 'live';

    if (!isSandbox && !SAFARICOM_IPS.includes(clientIp)) {
      console.warn('[callback] IP not whitelisted:', clientIp);
      return NextResponse.json({ ok: true });
    }

    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) return NextResponse.json({ ok: true });

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;

    console.log('[callback]', { CheckoutRequestID, ResultCode });
      // ── Find transaction ───────────────────────────────
    const txn = await db
      .select()
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID))
      .limit(1);

    if (!txn.length) {
      console.warn('[callback] transaction not found');
      return NextResponse.json({ ok: true });
    }

    const transaction = txn[0];

    // idempotency guard
    if (transaction.status !== 'PENDING') {
      console.log('[callback] already processed');
      return NextResponse.json({ ok: true });
    }

    // ── Parse metadata ────────────────────────────────
    const meta: Record<string, any> = {};
    (CallbackMetadata?.Item ?? []).forEach((item: any) => {
      meta[item.Name] = item.Value;
    });

    // =================================================
    // PAYMENT SUCCESS
    // =================================================
    if (ResultCode === 0) {
      console.log('[callback] PAYMENT SUCCESS');

      await db.update(mpesaTransactions)
        .set({
          status: 'SUCCESS',
          mpesaReceiptNumber: meta.MpesaReceiptNumber ?? null,
          resultCode: 0,
          resultDesc: ResultDesc,
          rawCallback: body,
        })
        .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID));

      const checkout = transaction.checkoutMetadata as any;
      if (!checkout) {
        console.error('[callback] missing checkout metadata');
        return NextResponse.json({ ok: true });
      }

      // ── Get platform fee ─────────────────────────────
      const feeSetting = await db
        .select({ value: platformSettings.value })
        .from(platformSettings)
        .where(eq(platformSettings.key, 'platform_fee_rate'))
        .limit(1);

      const platformFeeRate = parseFloat(feeSetting[0]?.value ?? '0.05');

      const unitPrice = parseFloat(checkout.unitPrice);
      const totalAmount = unitPrice * checkout.quantity;

      const commissionRate = parseFloat(
        checkout.affiliateCommissionRate ?? '0'
      );

      const affiliateCommission =
        checkout.affiliateId
          ? totalAmount * commissionRate
          : 0;

      const platformFee = totalAmount * platformFeeRate;

      const vendorEarnings =
        totalAmount - platformFee - affiliateCommission;

      // ── Atomic stock decrement ───────────────────────
      const stock = await db
        .update(products)
        .set({
          stockQuantity:
            sql`${products.stockQuantity} - ${checkout.quantity}`,
        })
        .where(
          and(
            eq(products.id, checkout.productId),
            sql`${products.stockQuantity} >= ${checkout.quantity}`,
          )
        )
        .returning();

      if (!stock.length) {
        console.error('[callback] STOCK EXHAUSTED AFTER PAYMENT');
        return NextResponse.json({ ok: true });
      }

      // ── Create Order ────────────────────────────────
      const orderId = crypto.randomUUID();

      await db.insert(orders).values({
        id: orderId,
        vendorId: checkout.vendorId,
        affiliateId: checkout.affiliateId ?? null,
        productId: checkout.productId,
        price: String(unitPrice),
        quantity: checkout.quantity,
        totalAmount: String(totalAmount),

        customerName: checkout.customerName,
        customerPhone: checkout.customerPhone,
        customerEmail: checkout.customerEmail ?? null,

        city: checkout.city ?? null,
        address: checkout.address ?? null,
        notes: checkout.notes ?? null,

        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',

        mpesaReceiptNumber: meta.MpesaReceiptNumber ?? null,
        paymentReference: meta.MpesaReceiptNumber ?? null,

        platformFee: String(platformFee),
        affiliateCommission: String(affiliateCommission),
        vendorEarnings: String(vendorEarnings),
        platformRevenue: String(platformFee),

        commissionsComputed: true,
        balancesReleased: false,
      });

      // link transaction
      await db.update(mpesaTransactions)
        .set({ orderId })
        .where(eq(mpesaTransactions.id, transaction.id));

      // ── Credit Vendor ───────────────────────────────
      const vendor = await db
        .select({ userId: vendorProfiles.userId })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.id, checkout.vendorId))
        .limit(1);

      if (vendor.length) {
        await db.update(balances)
          .set({
            pendingBalance:
              sql`${balances.pendingBalance} + ${vendorEarnings}`,
          })
          .where(eq(balances.userId, vendor[0].userId));
      }

      // ── Credit Affiliate ────────────────────────────
      if (checkout.affiliateId && affiliateCommission > 0) {
        const aff = await db
          .select({ userId: affiliateProfiles.userId })
          .from(affiliateProfiles)
          .where(eq(affiliateProfiles.id, checkout.affiliateId))
          .limit(1);

        if (aff.length) {
          await db.update(balances)
            .set({
              pendingBalance:
                sql`${balances.pendingBalance} + ${affiliateCommission}`,
            })
            .where(eq(balances.userId, aff[0].userId));
        }
      }

      // ── Credit Platform ─────────────────────────────
      const admin = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'ADMIN'))
        .limit(1);

      if (admin.length) {
        await db.update(balances)
          .set({
            availableBalance:
              sql`${balances.availableBalance} + ${platformFee}`,
          })
          .where(eq(balances.userId, admin[0].id));
      }

      // ── Send Email (non-blocking) ───────────────────
      if (checkout.customerEmail) {
        sendOrderConfirmationEmail({
          customerEmail: checkout.customerEmail,
          customerName: checkout.customerName,
          productTitle: checkout.productTitle ?? 'Your Order',
          totalAmount,
          orderId,
          shopName: checkout.shopName ?? 'Vendor',
          mpesaReceipt: meta.MpesaReceiptNumber ?? null,
        }).catch(console.error);
      }

      console.log('[callback] ORDER CREATED:', orderId);
    } else {
      console.log('[callback] PAYMENT FAILED');

      await db.update(mpesaTransactions)
        .set({
          status: 'FAILED',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          rawCallback: body,
        })
        .where(eq(mpesaTransactions.id, transaction.id));
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[callback] ERROR', err);
    return NextResponse.json({ ok: true });
  }
}
