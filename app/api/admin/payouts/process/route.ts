import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { db } from '@/lib/utils/db';
import {
  payoutRequests, balances, vendorProfiles,
  affiliateProfiles, users,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// M-Pesa B2C — sends money FROM shortcode TO customer phone
async function b2cTransfer({
  phone, amount, remarks, orderId,
}: {
  phone: string; amount: number; remarks: string; orderId: string;
}) {
  const MPESA_BASE = process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

  // Get token
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${creds}` } }
  );
  const { access_token } = await tokenRes.json();

  // Normalize phone
  let normalizedPhone = phone.replace(/\s/g, '');
  if (normalizedPhone.startsWith('0'))  normalizedPhone = '254' + normalizedPhone.slice(1);
  if (normalizedPhone.startsWith('+'))  normalizedPhone = normalizedPhone.slice(1);

  const res = await fetch(`${MPESA_BASE}/mpesa/b2c/v3/paymentrequest`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      OriginatorConversationID: orderId,
      InitiatorName:            process.env.MPESA_INITIATOR_NAME,
      SecurityCredential:       process.env.MPESA_SECURITY_CREDENTIAL,
      CommandID:                'BusinessPayment',
      Amount:                   Math.ceil(amount),
      PartyA:                   process.env.MPESA_SHORTCODE,
      PartyB:                   normalizedPhone,
      Remarks:                  remarks,
      QueueTimeOutURL:          `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/b2c/timeout`,
      ResultURL:                `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/b2c/result`,
      Occasion:                 'Payout',
    }),
  });

  return res.json();
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { payoutRequestId } = await req.json();

  // Fetch the payout request
  const payout = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutRequestId))
    .limit(1);

  if (!payout.length || payout[0].status !== 'REQUESTED') {
    return NextResponse.json({ error: 'Payout not found or already processed' }, { status: 404 });
  }

  const p = payout[0];

  // Get M-Pesa phone for this user
  let mpesaPhone: string | null = null;

  if (p.role === 'VENDOR') {
    const vendor = await db
      .select({ phone: vendorProfiles.phone })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, p.userId))
      .limit(1);
    mpesaPhone = vendor[0]?.phone ?? null;
  } else {
    const aff = await db
      .select({ phone: affiliateProfiles.mpesaPhone })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, p.userId))
      .limit(1);
    mpesaPhone = aff[0]?.phone ?? null;
  }

  if (!mpesaPhone) {
    return NextResponse.json({ error: 'No M-Pesa number on file for this user' }, { status: 400 });
  }

  // Trigger B2C
  const result = await b2cTransfer({
    phone:   mpesaPhone,
    amount:  parseFloat(p.amount),
    remarks: `AffilMarket ${p.role} Payout`,
    orderId: p.id,
  });

  if (result.ResponseCode !== '0') {
    return NextResponse.json({ error: result.ResponseDescription }, { status: 400 });
  }

  // Mark as PAID
  await db.update(payoutRequests)
    .set({ status: 'PAID', adminNote: `B2C: ${result.ConversationID}` })
    .where(eq(payoutRequests.id, payoutRequestId));

  // Update paid out total
  await db.update(balances)
    .set({
      paidOutTotal: String(
        parseFloat((await db.select().from(balances).where(eq(balances.userId, p.userId)).limit(1))[0]?.paidOutTotal ?? '0')
        + parseFloat(p.amount)
      ),
    })
    .where(eq(balances.userId, p.userId));

  return NextResponse.json({ success: true });
}
