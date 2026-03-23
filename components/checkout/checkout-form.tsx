'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// import { createOrder } from '@/action/checkoutAction';
// import { initiateMpesaPayment, queryPaymentStatus } from '@/action/mpesaAction';
import { formatKES } from '@/lib/utils';
import { ShoppingBag, Phone, User, Mail, MapPin, Loader2, CheckCircle, XCircle, AlertCircle, ChevronRight, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { initiateMpesaPayment, queryPaymentStatus } from '@/action/queryPaymentStatus';
import { createOrder } from '@/action/checkoutAction';

interface Product {
  id:            string;
  title:         string;
  slug:          string;
  price:         number;
  mainImageUrl:  string | null;
  shopName:      string;
  categoryName:  string | null;
  stockQuantity: number;
  commissionRate: number;
}

interface Props {
  product:     Product;
  affiliateId: string | null;
  affToken:    string | null;
  defaultQty:  number;
}

type Step = 'form' | 'paying' | 'polling' | 'success' | 'failed';

export function CheckoutForm({ product, affiliateId, affToken, defaultQty }: Props) {
  const router = useRouter();
  const [step,    setStep]    = useState<Step>('form');
  const [qty,     setQty]     = useState(defaultQty);
  const [form,    setForm]    = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '' });
  const [error,   setError]   = useState('');
  const [orderId, setOrderId] = useState('');
  const [checkoutRequestId, setCRId] = useState('');
  const [pollCount, setPollCount]    = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const total      = product.price * qty;
  const commission = affiliateId ? (total * product.commissionRate) : 0;

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Poll payment status ────────────────────────────────────
  useEffect(() => {
    if (step !== 'polling' || !checkoutRequestId || !orderId) return;

    const poll = async () => {
      const result = await queryPaymentStatus(checkoutRequestId, orderId);

      if (result.status === 'PAID') {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep('success');
        return;
      }
      if (result.status === 'CANCELLED') {
        if (pollRef.current) clearInterval(pollRef.current);
        setStep('failed');
        return;
      }

      setPollCount(c => {
        if (c >= 18) { // 3 min max (18 × 10s)
          clearInterval(pollRef.current!);
          setStep('failed');
        }
        return c + 1;
      });
    };

    pollRef.current = setInterval(poll, 10000);
    poll(); // immediate first check

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, checkoutRequestId, orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())  return setError('Full name is required');
    if (!form.phone.trim()) return setError('Phone number is required');
    if (!/^(\+?254|0)[17]\d{8}$/.test(form.phone.replace(/\s/g, ''))) {
      return setError('Enter a valid Kenyan phone number (e.g. 0712345678)');
    }

    setStep('paying');

    // 1. Create order
    const orderResult = await createOrder ({
      productId:     product.id,
      affiliateId:   affiliateId,
      quantity:      qty,
      customerName:  form.name.trim(),
      customerPhone: form.phone.trim(),
      customerEmail: form.email.trim() || null,
      city:          form.city.trim() || null,
      address:       form.address.trim() || null,
      notes:         form.notes.trim() || null,
    });

    if (orderResult.error || !orderResult.orderId) {
      setError(orderResult.error ?? 'Failed to create order');
      setStep('form');
      return;
    }

    setOrderId(orderResult.orderId);

    // 2. Trigger M-Pesa STK push
    const mpesaResult = await initiateMpesaPayment(
      orderResult.orderId,
      form.phone.trim(),
      total,
    );

    if (mpesaResult.error || !mpesaResult.checkoutRequestId) {
      setError(mpesaResult.error ?? 'M-Pesa request failed');
      setStep('form');
      return;
    }

    setCRId(mpesaResult.checkoutRequestId);
    setStep('polling');
  };

  // ── SUCCESS screen ─────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={pageStyle}>
        <div style={centerBox}>
          <div style={{ fontSize: 64, marginBottom: 16, textAlign: 'center' }}>🎉</div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111', margin: '0 0 8px', letterSpacing: '-0.04em' }}>Payment Confirmed!</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              Your order for <strong>{product.title}</strong> has been received.<br />
              The vendor will contact you at <strong>{form.phone}</strong>.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
                <span>{product.title} × {qty}</span>
                <span style={{ fontWeight: 700 }}>{formatKES(total)}</span>
              </div>
              {affiliateId && (
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                  ✓ Affiliate referral tracked
                </div>
              )}
            </div>
            <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', color: '#fff', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              <ShoppingBag size={15} /> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── FAILED screen ──────────────────────────────────────────
  if (step === 'failed') {
    return (
      <div style={pageStyle}>
        <div style={centerBox}>
          <div style={{ fontSize: 64, marginBottom: 16, textAlign: 'center' }}>😔</div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>Payment Cancelled</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>The M-Pesa prompt was cancelled or timed out. Your order was not charged.</p>
            <button onClick={() => { setStep('form'); setError(''); }} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── POLLING screen ─────────────────────────────────────────
  if (step === 'polling') {
    return (
      <div style={pageStyle}>
        <div style={centerBox}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
              📱
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 10px' }}>Check Your Phone</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 6px' }}>
              An M-Pesa prompt has been sent to
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 20px', letterSpacing: '0.02em' }}>
              {form.phone}
            </p>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#92400e' }}>
              <strong>Enter your M-Pesa PIN</strong> to pay {formatKES(total)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Waiting for payment... ({Math.max(0, 18 - pollCount) * 10}s remaining)
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── PAYING screen ──────────────────────────────────────────
  if (step === 'paying') {
    return (
      <div style={pageStyle}>
        <div style={centerBox}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#16a34a', marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Creating your order...</h2>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .co { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #f8f7f4; }
        .co-nav { background: #fff; border-bottom: 1px solid #e5e7eb; height: 60px; display: flex; align-items: center; padding: 0 24px; gap: 16px; }
        .co-logo { font-size: 18px; font-weight: 800; color: #111; text-decoration: none; letter-spacing: -0.03em; }
        .co-logo span { color: #16a34a; }
        .co-body { max-width: 1000px; margin: 0 auto; padding: 32px 24px; display: grid; grid-template-columns: 1fr 380px; gap: 28px; }
        .co-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; margin-bottom: 16px; }
        .co-section-head { padding: 14px 20px; border-bottom: 1px solid #f3f4f6; background: #fafafa; display: flex; align-items: center; gap: 10px; }
        .co-section-icon { width: 28px; height: 28px; border-radius: 7px; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; color: #16a34a; }
        .co-section-title { font-size: 13.5px; font-weight: 700; color: #111; }
        .co-section-body { padding: 18px 20px; }
        .co-field { margin-bottom: 16px; }
        .co-label { display: block; font-size: 12.5px; font-weight: 700; color: #374151; margin-bottom: 5px; }
        .co-input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 11px 14px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #111; outline: none; transition: border-color 0.15s; }
        .co-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.08); }
        .co-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .co-summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; position: sticky; top: 20px; }
        .co-product-row { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6; }
        .co-product-img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; border: 1px solid #e5e7eb; flex-shrink: 0; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .co-product-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; line-height: 1.3; }
        .co-product-shop { font-size: 12px; color: #9ca3af; }
        .co-qty-row { display: flex; align-items: center; gap: 10px; justify-content: space-between; margin-bottom: 16px; }
        .co-qty-label { font-size: 13px; color: #374151; font-weight: 600; }
        .co-qty-ctrl { display: flex; align-items: center; gap: 8px; }
        .co-qty-btn { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
        .co-qty-btn:hover:not(:disabled) { border-color: #16a34a; color: #16a34a; }
        .co-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .co-qty-num { font-size: 15px; font-weight: 800; color: #111; min-width: 24px; text-align: center; }
        .co-line-row { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
        .co-total-row { display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #111; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        .co-aff-row { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; margin: 12px 0; }
        .co-aff-label { font-size: 12px; color: #15803d; font-weight: 600; }
        .co-aff-amount { font-size: 14px; font-weight: 800; color: #16a34a; }
        .co-pay-btn { width: 100%; padding: 14px; background: #16a34a; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; transition: background 0.2s; }
        .co-pay-btn:hover { background: #15803d; }
        .co-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #991b1b; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 8px; }
        .co-mpesa-hint { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; justify-content: center; margin-top: 10px; }
        @media (max-width: 768px) { .co-body { grid-template-columns: 1fr; } .co-summary-card { position: static; order: -1; } .co-grid2 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="co">
        <nav className="co-nav">
          <Link href="/" className="co-logo"><span>Affil</span>Market</Link>
          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>/ Checkout</span>
          <div style={{ flex: 1 }} />
          <Link href={`/products/${product.slug}`} style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Back to product</Link>
        </nav>

        <form className="co-body" onSubmit={handleSubmit} noValidate>

          {/* ── LEFT — Form ── */}
          <div>
            {error && (
              <div className="co-error">
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            {/* Contact */}
            <div className="co-section">
              <div className="co-section-head">
                <div className="co-section-icon"><User size={13} /></div>
                <span className="co-section-title">Your Details</span>
              </div>
              <div className="co-section-body">
                <div className="co-field">
                  <label className="co-label">Full Name *</label>
                  <input className="co-input" placeholder="Jane Muthoni" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="co-grid2">
                  <div className="co-field">
                    <label className="co-label">M-Pesa Phone *</label>
                    <input className="co-input" type="tel" placeholder="0712 345 678" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Email (optional)</label>
                    <input className="co-input" type="email" placeholder="jane@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery */}
            <div className="co-section">
              <div className="co-section-head">
                <div className="co-section-icon"><MapPin size={13} /></div>
                <span className="co-section-title">Delivery Details</span>
              </div>
              <div className="co-section-body">
                <div className="co-grid2">
                  <div className="co-field">
                    <label className="co-label">City / Town</label>
                    <input className="co-input" placeholder="Nairobi" value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Area / Street</label>
                    <input className="co-input" placeholder="Westlands" value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>
                <div className="co-field" style={{ marginBottom: 0 }}>
                  <label className="co-label">Order Notes (optional)</label>
                  <textarea className="co-input" rows={2} placeholder="Any special instructions..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Summary ── */}
          <div>
            <div className="co-summary-card">
              <div style={{ fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Summary</div>

              {/* Product */}
              <div className="co-product-row">
                <div className="co-product-img">
                  {product.mainImageUrl
                    ? <img src={product.mainImageUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                    : '🛍️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="co-product-title">{product.title}</div>
                  <div className="co-product-shop">{product.shopName}</div>
                </div>
              </div>

              {/* Quantity */}
              <div className="co-qty-row">
                <span className="co-qty-label">Quantity</span>
                <div className="co-qty-ctrl">
                  <button type="button" className="co-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>
                    <Minus size={12} />
                  </button>
                  <span className="co-qty-num">{qty}</span>
                  <button type="button" className="co-qty-btn" onClick={() => setQty(q => Math.min(product.stockQuantity, q + 1))} disabled={qty >= product.stockQuantity}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="co-line-row">
                <span>{formatKES(product.price)} × {qty}</span>
                <span>{formatKES(total)}</span>
              </div>

              {affiliateId && (
                <div className="co-aff-row">
                  <span className="co-aff-label">🔗 Via affiliate referral</span>
                  <span className="co-aff-amount">tracked</span>
                </div>
              )}

              <div className="co-total-row">
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>

              <button type="submit" className="co-pay-btn">
                <Phone size={16} /> Pay {formatKES(total)} via M-Pesa
              </button>

              <div className="co-mpesa-hint">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/320px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" style={{ height: 18 }} />
                STK Push to your phone
              </div>

              <div style={{ marginTop: 14, fontSize: 11.5, color: '#9ca3af', textAlign: 'center', lineHeight: 1.6 }}>
                🔒 Secure payment via Safaricom M-Pesa.<br />
                You will receive a prompt on your phone.
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: '#f8f7f4', fontFamily: 'DM Sans, sans-serif',
};

const centerBox: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb',
  borderRadius: 20, padding: '48px 40px',
  maxWidth: 440, width: '100%', margin: '0 24px',
};
