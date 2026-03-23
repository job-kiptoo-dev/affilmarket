import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDeliveryConfirmationEmail({
  customerEmail,
  customerName,
  productTitle,
  orderId,
  shopName,
}: {
  customerEmail: string;
  customerName:  string;
  productTitle:  string;
  orderId:       string;
  shopName:      string;
}) {
  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/confirm`;
  const reviewUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/review`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#f8f7f4;font-family:'DM Sans',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background:#111;padding:28px 40px;text-align:center;">
                  <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.03em;">
                    <span style="color:#4ade80;">Affil</span>Market
                  </span>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="font-size:16px;color:#6b7280;margin:0 0 8px;">Hey {customerName} 👋</p>
                  <h1 style="font-size:24px;font-weight:800;color:#111;letter-spacing:-0.04em;margin:0 0 16px;">
                    Did you receive your order?
                  </h1>
                  
                  <!-- Product card -->
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin:0 0 4px;">Your order from</p>
                    <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 2px;">{productTitle}</p>
                    <p style="font-size:13px;color:#6b7280;margin:0;">Sold by {shopName}</p>
                  </div>

                  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
                    {shopName} has marked your order as <strong>shipped</strong>. 
                    If you've received your item, please confirm delivery below. 
                    This releases payment to the vendor.
                  </p>

                  <!-- CTA -->
                  <div style="text-align:center;margin-bottom:24px;">
                    <a href="{confirmUrl}"
                       style="display:inline-block;background:#16a34a;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:-0.01em;">
                      ✓ Yes, I received my order
                    </a>
                  </div>

                  <!-- Review link -->
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;margin-bottom:24px;text-align:center;">
                    <p style="font-size:13px;color:#15803d;margin:0 0 8px;">Happy with your purchase?</p>
                    <a href="{reviewUrl}" style="font-size:13px;font-weight:700;color:#16a34a;text-decoration:none;">
                      ⭐ Leave a review →
                    </a>
                  </div>

                  <!-- Dispute note -->
                  <p style="font-size:12.5px;color:#9ca3af;line-height:1.6;margin:0;text-align:center;">
                    Haven't received your order? Don't confirm delivery.<br/>
                    Contact us at <a href="mailto:support@affilmarket.co.ke" style="color:#16a34a;">support@affilmarket.co.ke</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="font-size:12px;color:#9ca3af;margin:0;">
                    © ${new Date().getFullYear()} AffilMarket Kenya. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
    .replace(/{customerName}/g, customerName)
    .replace(/{productTitle}/g, productTitle)
    .replace(/{shopName}/g, shopName)
    .replace(/{confirmUrl}/g, confirmUrl)
    .replace(/{reviewUrl}/g, reviewUrl);

  try {
    const result = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      customerEmail,
      subject: `Did you receive your order? — ${productTitle}`,
      html,
    });

    console.log('[sendDeliveryConfirmationEmail] sent:', result);
    return { success: true };
  } catch (err) {
    console.error('[sendDeliveryConfirmationEmail] failed:', err);
    return { error: 'Failed to send email' };
  }
}

export async function sendOrderConfirmationEmail({
  customerEmail,
  customerName,
  productTitle,
  totalAmount,
  orderId,
  shopName,
  mpesaReceipt,
}: {
  customerEmail: string;
  customerName:  string;
  productTitle:  string;
  totalAmount:   number;
  orderId:       string;
  shopName:      string;
  mpesaReceipt:  string | null;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f8f7f4;font-family:'DM Sans',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              
              <tr>
                <td style="background:#111;padding:28px 40px;text-align:center;">
                  <span style="font-size:22px;font-weight:800;color:#fff;">
                    <span style="color:#4ade80;">Affil</span>Market
                  </span>
                </td>
              </tr>

              <tr>
                <td style="padding:36px 40px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                    <h1 style="font-size:24px;font-weight:800;color:#111;margin:0 0 8px;">Order Confirmed!</h1>
                    <p style="font-size:14px;color:#6b7280;margin:0;">Your payment was received successfully.</p>
                  </div>

                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:4px;">Product</td>
                        <td style="font-size:14px;font-weight:700;color:#111;text-align:right;">${productTitle}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding-top:10px;">Vendor</td>
                        <td style="font-size:14px;color:#374151;text-align:right;padding-top:10px;">${shopName}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:12px;"></td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#374151;font-weight:700;">Total Paid</td>
                        <td style="font-size:18px;font-weight:800;color:#16a34a;text-align:right;">KES ${totalAmount.toLocaleString('en-KE')}</td>
                      </tr>
                      ${mpesaReceipt ? `
                      <tr>
                        <td style="font-size:12px;color:#9ca3af;padding-top:6px;">M-Pesa Receipt</td>
                        <td style="font-size:12px;color:#6b7280;text-align:right;padding-top:6px;font-family:monospace;">${mpesaReceipt}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
                    The vendor will contact you to arrange delivery. 
                    You'll receive another email to confirm when your item arrives.
                  </p>

                  <p style="font-size:12.5px;color:#9ca3af;text-align:center;margin:0;">
                    Questions? Email us at 
                    <a href="mailto:support@affilmarket.co.ke" style="color:#16a34a;">support@affilmarket.co.ke</a>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="font-size:12px;color:#9ca3af;margin:0;">
                    © ${new Date().getFullYear()} AffilMarket Kenya
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      customerEmail,
      subject: `Order confirmed — ${productTitle}`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('[sendOrderConfirmationEmail]', err);
    return { error: 'Failed to send email' };
  }
}
