import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/utils/db';
import {
  orders, mpesaTransactions, balances,
  products, affiliateProfiles, vendorProfiles,
  users, platformSettings,
} from '@/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';

// Safaricom IP whitelist
const SAFARICOM_IPS = [
  '196.201.214.200', '196.201.214.206', '196.201.213.114',
  '196.201.214.207', '196.201.214.208', '196.201.213.44',
  '196.201.212.127', '196.201.212.138', '196.201.212.129',
  '196.201.212.136', '196.201.212.74',  '196.201.212.69',
];

export async function POST(req: NextRequest) {
  try {
    // ── IP whitelist check ───────────────────────────────────────
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
                  ?? req.headers.get('remote-addr')
                  ?? '';

    // Skip IP check on sandbox/localhost
    const isSandbox = process.env.MPESA_ENVIRONMENT !== 'live';
    if (!isSandbox && !SAFARICOM_IPS.includes(clientIp)) {
      console.warn('[callback] IP not whitelisted:', clientIp);
      return NextResponse.json({ ok: true }); // always 200 to Safaricom
    }

    const body     = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ok: true });
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;

    console.log('[callback] received:', { CheckoutRequestID, ResultCode, ResultDesc });

    // ── Find the pending transaction ─────────────────────────────
    const txn = await db
      .select()
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID))
      .limit(1);

    if (!txn.length) {
      console.warn('[callback] transaction not found:', CheckoutRequestID);
      return NextResponse.json({ ok: true });
    }

    const transaction = txn[0];

    // Already processed — idempotency guard
    if (transaction.status !== 'PENDING') {
      console.log('[callback] already processed:', CheckoutRequestID);
      return NextResponse.json({ ok: true });
    }

    // ── Parse Safaricom metadata ─────────────────────────────────
    const meta: Record<string, any> = {};
    (CallbackMetadata?.Item ?? []).forEach((item: any) => {
      meta[item.Name] = item.Value;
    });

    if (ResultCode === 0) {
      // ── PAYMENT SUCCESS ────────────────────────────────────────

      console.log('[callback] payment success:', meta);

      // Update transaction record
      await db.update(mpesaTransactions)
        .set({
          status:             'SUCCESS',
          mpesaReceiptNumber: meta.MpesaReceiptNumber ?? null,
          resultCode:         0,
          resultDesc:         ResultDesc,
          rawCallback:        body,
        })
        .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID));

      // Get checkout metadata saved at STK push time
      const checkout = transaction.checkoutMetadata as any;
      if (!checkout) {
        console.error('[callback] missing checkoutMetadata for:', transaction.id);
        return NextResponse.json({ ok: true });
      }

      // ── Get platform fee rate ──────────────────────────────────
      const feeSetting = await db
        .select({ value: platformSettings.value })
        .from(platformSettings)
        .where(eq(platformSettings.key, 'platform_fee_rate'))
        .limit(1);

      const platformFeeRate = parseFloat(feeSetting[0]?.value ?? '0.05');
      const unitPrice       = parseFloat(checkout.unitPrice);
      const commRate        = parseFloat(checkout.affiliateCommissionRate);
      const totalAmount     = unitPrice * checkout.quantity;
      const platformFee     = totalAmount * platformFeeRate;
      const affiliateComm   = checkout.affiliateId ? totalAmount * commRate : 0;
      const vendorEarnings  = totalAmount - platformFee - affiliateComm;

      // ── Atomic stock decrement ─────────────────────────────────
      const stockUpdate = await db
        .update(products)
        .set({ stockQuantity: sql`${products.stockQuantity} - ${checkout.quantity}` })
        .where(
          and(
            eq(products.id, checkout.productId),
            sql`${products.stockQuantity} >= ${checkout.quantity}`,
          )
        )
        .returning({ id: products.id });

      if (!stockUpdate.length) {
        // Stock ran out between STK push and payment
        console.error('[callback] OVERSELL - stock exhausted after payment:', {
          productId: checkout.productId,
          receipt:   meta.MpesaReceiptNumber,
        });
        // TODO: trigger B2C refund here in production
        return NextResponse.json({ ok: true });
      }

      // ── Create the order ───────────────────────────────────────
      const orderId = crypto.randomUUID();

      await db.insert(orders).values({
        id:                  orderId,
        vendorId:            checkout.vendorId,
        affiliateId:         checkout.affiliateId  ?? null,
        productId:           checkout.productId,
        price:               String(unitPrice),
        quantity:            checkout.quantity,
        totalAmount:         String(totalAmount),
        customerName:        checkout.customerName,
        customerPhone:       checkout.customerPhone,
        customerEmail:       checkout.customerEmail ?? null,
        city:                checkout.city          ?? null,
        address:             checkout.address       ?? null,
        notes:               checkout.notes         ?? null,
        paymentStatus:       'PAID',
        orderStatus:         'CONFIRMED',
        mpesaReceiptNumber:  meta.MpesaReceiptNumber ?? null,
        paymentReference:    meta.MpesaReceiptNumber ?? null,
        platformFee:         String(platformFee),
        affiliateCommission: String(affiliateComm),
        vendorEarnings:      String(vendorEarnings),
        platformRevenue:     String(platformFee),
        commissionsComputed: true,
        balancesReleased:    false,
      });

      // Link transaction → order
      await db.update(mpesaTransactions)
        .set({ orderId })
        .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID));

      // ── Credit vendor pending balance ──────────────────────────
      const vendorUser = await db
        .select({ userId: vendorProfiles.userId })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.id, checkout.vendorId))
        .limit(1);

      if (vendorUser.length) {
        await db.update(balances)
          .set({ pendingBalance: sql`${balances.pendingBalance} + ${String(vendorEarnings)}` })
          .where(eq(balances.userId, vendorUser[0].userId));
      }

      // ── Credit affiliate pending balance ───────────────────────
      if (checkout.affiliateId && affiliateComm > 0) {
        const affUser = await db
          .select({ userId: affiliateProfiles.userId })
          .from(affiliateProfiles)
          .where(eq(affiliateProfiles.id, checkout.affiliateId))
          .limit(1);

        if (affUser.length) {
          await db.update(balances)
            .set({ pendingBalance: sql`${balances.pendingBalance} + ${String(affiliateComm)}` })
            .where(eq(balances.userId, affUser[0].userId));
        }
      }

      // ── Credit platform fee to admin ───────────────────────────
      const adminUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'ADMIN'))
        .limit(1);

      if (adminUser.length) {
        const adminBal = await db
          .select()
          .from(balances)
          .where(eq(balances.userId, adminUser[0].id))
          .limit(1);

        if (adminBal.length) {
          await db.update(balances)
            .set({ availableBalance: sql`${balances.availableBalance} + ${String(platformFee)}` })
            .where(eq(balances.userId, adminUser[0].id));
        } else {
          await db.insert(balances).values({
            id:               crypto.randomUUID(),
            userId:           adminUser[0].id,
            availableBalance: String(platformFee),
            pendingBalance:   '0',
            paidOutTotal:     '0',
          });
        }
      }

      console.log('[callback] order created successfully:', orderId);

    } else {
      // ── PAYMENT FAILED / CANCELLED ─────────────────────────────
      console.log('[callback] payment failed:', { ResultCode, ResultDesc });

      await db.update(mpesaTransactions)
        .set({
          status:      'FAILED',
          resultCode:  ResultCode,
          resultDesc:  ResultDesc,
          rawCallback: body,
        })
        .where(eq(mpesaTransactions.checkoutRequestId, CheckoutRequestID));

      // No order created — nothing to clean up
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[mpesa/callback] unhandled error:', err);
    return NextResponse.json({ ok: true }); // always 200 to Safaricom
  }
}
