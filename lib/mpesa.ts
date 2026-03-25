'use server';
import axios from 'axios';

const MPESA_BASE_URL =
  process.env.MPESA_ENVIRONMENT === 'live'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

async function getToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const res = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { authorization: `Basic ${auth}` } }
  );

  return res.data.access_token;
}

function getTimestamp(): string {
  const date = new Date();
  return (
    date.getFullYear() +
    ('0' + (date.getMonth() + 1)).slice(-2) +
    ('0' + date.getDate()).slice(-2) +
    ('0' + date.getHours()).slice(-2) +
    ('0' + date.getMinutes()).slice(-2) +
    ('0' + date.getSeconds()).slice(-2)
  );
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `254${cleaned.slice(-9)}`;
}

function getPassword(timestamp: string): string {
  return Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');
}

export async function stkPush({
  phone,
  amount,
  orderId,
}: {
  phone:   string;
  amount:  number;
  orderId: string;
}) {
  try {
    const token         = await getToken();
    const timestamp     = getTimestamp();
    const password      = getPassword(timestamp);
    const formattedPhone = formatPhone(phone);

    const res = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.ceil(amount),
        PartyA:            formattedPhone,
        PartyB:            process.env.MPESA_SHORTCODE,
        PhoneNumber:       formattedPhone,
        CallBackURL:       process.env.MPESA_CALLBACK_URL,
        AccountReference:  formattedPhone,
        TransactionDesc:   `Order ${orderId.slice(0, 8).toUpperCase()}`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return { data: res.data };
  } catch (error) {
    console.error('[stkPush error]', error);
    if (error instanceof Error) return { error: error.message };
    return { error: 'M-Pesa request failed' };
  }
}

export async function stkQuery(checkoutRequestId: string) {
  try {
    const token     = await getToken();
    const timestamp = getTimestamp();
    const password  = getPassword(timestamp);

    const res = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return { data: res.data };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    return { error: 'Query failed' };
  }
}

// /**
//  * AffilMarket Kenya — M-Pesa Daraja API Integration
//  * Supports: STK Push (Lipa Na M-Pesa Online), Transaction Status, OAuth
//  */
//
// const MPESA_BASE_URL = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
// const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
// const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
// const SHORTCODE = process.env.MPESA_SHORTCODE || '';
// const PASSKEY = process.env.MPESA_PASSKEY || '';
// const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || '';
//
// // ─────────────────────────────────────────────
// // OAuth Token
// // ─────────────────────────────────────────────
//
// let cachedToken: { token: string; expiresAt: number } | null = null;
//
// export async function getMpesaAccessToken(): Promise<string> {
//   // Return cached token if still valid (with 60s buffer)
//   if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
//     return cachedToken.token;
//   }
//
//   const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
//
//   const response = await fetch(
//     `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
//     {
//       method: 'GET',
//       headers: {
//         Authorization: `Basic ${credentials}`,
//         'Content-Type': 'application/json',
//       },
//     }
//   );
//
//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`M-Pesa OAuth failed: ${response.status} ${text}`);
//   }
//
//   const data = await response.json();
//   cachedToken = {
//     token: data.access_token,
//     expiresAt: Date.now() + data.expires_in * 1000,
//   };
//
//   return cachedToken.token;
// }
//
// // ─────────────────────────────────────────────
// // Generate STK Push Password
// // ─────────────────────────────────────────────
//
// function generateStkPassword(timestamp: string): string {
//   const raw = `${SHORTCODE}${PASSKEY}${timestamp}`;
//   return Buffer.from(raw).toString('base64');
// }
//
// function getTimestamp(): string {
//   return new Date()
//     .toISOString()
//     .replace(/[-:T.Z]/g, '')
//     .slice(0, 14);
// }
//
// // ─────────────────────────────────────────────
// // STK Push (Lipa Na M-Pesa Online)
// // ─────────────────────────────────────────────
//
// export interface StkPushParams {
//   phone: string;       // 254XXXXXXXXX format
//   amount: number;      // KES, whole number
//   orderId: string;     // used as AccountReference
//   description: string;
// }
//
// export interface StkPushResponse {
//   MerchantRequestID: string;
//   CheckoutRequestID: string;
//   ResponseCode: string;
//   ResponseDescription: string;
//   CustomerMessage: string;
// }
//
// export async function initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
//   const token = await getMpesaAccessToken();
//   const timestamp = getTimestamp();
//   const password = generateStkPassword(timestamp);
//
//   // Sanitize phone: ensure starts with 254
//   const phone = params.phone.replace(/^(\+254|0)/, '254');
//
//   const body = {
//     BusinessShortCode: SHORTCODE,
//     Password: password,
//     Timestamp: timestamp,
//     TransactionType: 'CustomerPayBillOnline',
//     Amount: Math.ceil(params.amount), // M-Pesa requires whole numbers
//     PartyA: phone,
//     PartyB: SHORTCODE,
//     PhoneNumber: phone,
//     CallBackURL: CALLBACK_URL,
//     AccountReference: params.orderId.slice(0, 12), // max 12 chars
//     TransactionDesc: params.description.slice(0, 13), // max 13 chars
//   };
//
//   const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(body),
//   });
//
//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`STK Push failed: ${response.status} ${text}`);
//   }
//
//   return response.json();
// }
//
// // ─────────────────────────────────────────────
// // STK Query (Poll transaction status)
// // ─────────────────────────────────────────────
//
// export interface StkQueryResponse {
//   ResponseCode: string;
//   ResponseDescription: string;
//   MerchantRequestID: string;
//   CheckoutRequestID: string;
//   ResultCode: string;
//   ResultDesc: string;
// }
//
// export async function queryStkPushStatus(
//   checkoutRequestId: string
// ): Promise<StkQueryResponse> {
//   const token = await getMpesaAccessToken();
//   const timestamp = getTimestamp();
//   const password = generateStkPassword(timestamp);
//
//   const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       BusinessShortCode: SHORTCODE,
//       Password: password,
//       Timestamp: timestamp,
//       CheckoutRequestID: checkoutRequestId,
//     }),
//   });
//
//   if (!response.ok) {
//     const text = await response.text();
//     throw new Error(`STK Query failed: ${response.status} ${text}`);
//   }
//
//   return response.json();
// }
//
// // ─────────────────────────────────────────────
// // Callback Parser
// // ─────────────────────────────────────────────
//
// export interface MpesaCallbackResult {
//   merchantRequestId: string;
//   checkoutRequestId: string;
//   resultCode: number;
//   resultDesc: string;
//   mpesaReceiptNumber?: string;
//   transactionDate?: string;
//   phoneNumber?: string;
//   amount?: number;
// }
//
// export function parseStkCallback(body: any): MpesaCallbackResult {
//   const stkCallback = body?.Body?.stkCallback;
//
//   if (!stkCallback) {
//     throw new Error('Invalid M-Pesa callback structure');
//   }
//
//   const result: MpesaCallbackResult = {
//     merchantRequestId: stkCallback.MerchantRequestID,
//     checkoutRequestId: stkCallback.CheckoutRequestID,
//     resultCode: stkCallback.ResultCode,
//     resultDesc: stkCallback.ResultDesc,
//   };
//
//   // On success (ResultCode === 0), extract metadata
//   if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata?.Item) {
//     const items: Array<{ Name: string; Value: any }> = stkCallback.CallbackMetadata.Item;
//
//     for (const item of items) {
//       switch (item.Name) {
//         case 'MpesaReceiptNumber':
//           result.mpesaReceiptNumber = String(item.Value);
//           break;
//         case 'TransactionDate':
//           result.transactionDate = String(item.Value);
//           break;
//         case 'PhoneNumber':
//           result.phoneNumber = String(item.Value);
//           break;
//         case 'Amount':
//           result.amount = Number(item.Value);
//           break;
//       }
//     }
//   }
//
//   return result;
// }
//
// // ─────────────────────────────────────────────
// // Format phone for display
// // ─────────────────────────────────────────────
//
// export function formatKenyanPhone(phone: string): string {
//   const clean = phone.replace(/\D/g, '');
//   if (clean.startsWith('254') && clean.length === 12) {
//     return `+${clean}`;
//   }
//   if (clean.startsWith('0') && clean.length === 10) {
//     return `+254${clean.slice(1)}`;
//   }
//   return phone;
// }
//
// export function phoneToMpesaFormat(phone: string): string {
//   const clean = phone.replace(/\D/g, '');
//   if (clean.startsWith('254')) return clean;
//   if (clean.startsWith('0')) return `254${clean.slice(1)}`;
//   if (clean.startsWith('+')) return clean.slice(1);
//   return `254${clean}`;
// }
