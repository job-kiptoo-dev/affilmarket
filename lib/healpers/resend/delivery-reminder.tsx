import {
  Html, Head, Body, Container, Section,
  Text, Button, Hr, Img, Preview,
} from '@react-email/components';

interface DeliveryReminderProps {
  customerName:  string;
  productTitle:  string;
  shopName:      string;
  orderId:       string;
  confirmUrl:    string;
  productImage?: string | null;
}

export function DeliveryReminderEmail({
  customerName,
  productTitle,
  shopName,
  orderId,
  confirmUrl,
  productImage,
}: DeliveryReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Did your order from {shopName} arrive? Please confirm delivery.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Text style={logo}>
            <span style={{ color: '#16a34a' }}>Affil</span>Market
          </Text>

          {/* Hero */}
          <Section style={hero}>
            <Text style={{ fontSize: 40, margin: '0 0 8px' }}>📦</Text>
            <Text style={heroTitle}>Did your order arrive?</Text>
            <Text style={heroSub}>
              Hi {customerName}, your order should have arrived by now.
              Please confirm so the vendor gets paid.
            </Text>
          </Section>

          {/* Product card */}
          <Section style={card}>
            {productImage && (
              <Img
                src={productImage}
                alt={productTitle}
                width={56}
                height={56}
                style={productImg}
              />
            )}
            <div>
              <Text style={productName}>{productTitle}</Text>
              <Text style={shopLabel}>Sold by {shopName}</Text>
              <Text style={orderId_}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>
            </div>
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={{ textAlign: 'center' as const, padding: '8px 0 24px' }}>
            <Text style={ctaText}>
              Tap the button below to confirm you received your order:
            </Text>
            <Button href={confirmUrl} style={button}>
              ✅ Yes, I received my order
            </Button>
          </Section>

          {/* Warning */}
          <Section style={warning}>
            <Text style={warningText}>
              ⏰ If we don't hear from you within 24 hours, the order will be
              automatically marked as delivered.
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            If you have any issues with your order, please contact us before confirming.
            <br />© {new Date().getFullYear()} AffilMarket. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ──────────────────────────────────────────
const body:       React.CSSProperties = { backgroundColor: '#f8f7f4', fontFamily: 'DM Sans, sans-serif' };
const container:  React.CSSProperties = { maxWidth: 480, margin: '40px auto', backgroundColor: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden' };
const logo:       React.CSSProperties = { fontSize: 22, fontWeight: 800, textAlign: 'center', padding: '28px 0 0', letterSpacing: '-0.03em' };
const hero:       React.CSSProperties = { textAlign: 'center', padding: '24px 32px 0' };
const heroTitle:  React.CSSProperties = { fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 8px', letterSpacing: '-0.03em' };
const heroSub:    React.CSSProperties = { fontSize: 14, color: '#6b7280', margin: 0, lineHeight: '1.6' };
const card:       React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, margin: '24px 32px', padding: '14px 16px' };
const productImg: React.CSSProperties = { borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', marginRight: 12 };
const productName:React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 2px' };
const shopLabel:  React.CSSProperties = { fontSize: 12, color: '#9ca3af', margin: '0 0 2px' };
const orderId_:   React.CSSProperties = { fontSize: 11, color: '#d1d5db', margin: 0 };
const divider:    React.CSSProperties = { borderColor: '#f3f4f6', margin: '0 32px' };
const ctaText:    React.CSSProperties = { fontSize: 14, color: '#374151', margin: '0 0 16px' };
const button:     React.CSSProperties = { backgroundColor: '#16a34a', color: '#fff', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' };
const warning:    React.CSSProperties = { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, margin: '16px 32px', padding: '12px 16px' };
const warningText:React.CSSProperties = { fontSize: 13, color: '#92400e', margin: 0 };
const footer:     React.CSSProperties = { fontSize: 11.5, color: '#9ca3af', textAlign: 'center', padding: '16px 32px 28px', lineHeight: '1.6' };
