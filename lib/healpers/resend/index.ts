import { Resend } from 'resend';
import { render } from '@react-email/render';
import { DeliveryReminderEmail } from './delivery-reminder';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeliveryReminderEmail(params: {
  customerEmail: string;
  customerName:  string;
  productTitle:  string;
  shopName:      string;
  orderId:       string;
  confirmUrl:    string;
  productImage?: string | null;
}) {
  const html = await render(
    DeliveryReminderEmail(params)
  );

  return resend.emails.send({
    from:    'AffilMarket <no-reply@yourdomain.com>', // ← change to your domain
    to:      params.customerEmail,
    subject: `📦 Did your order from ${params.shopName} arrive?`,
    html,
  });
}
