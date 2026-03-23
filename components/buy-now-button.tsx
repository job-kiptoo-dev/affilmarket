'use client';

import { useState }    from 'react';
import { ShoppingBag } from 'lucide-react';

interface BuyNowButtonProps extends React.CSSProperties {
  productId:    string;
  productTitle: string;
  price:        number;
  affToken?:    string;
  disabled?:    boolean;
  style?:       React.CSSProperties;
}

export function BuyNowButton({
  productId,
  productTitle,
  price,
  affToken,
  disabled = false,
  style,
}: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, affToken }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Checkout failed' }));
        alert(err.message ?? 'Something went wrong. Please try again.');
        return;
      }

      const { checkoutUrl } = await res.json();
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleBuy}
      disabled={disabled || loading}
      style={{
        width:          '100%',
        padding:        '14px',
        background:     disabled ? '#d1fae5' : '#16a34a',
        color:          disabled ? '#6b7280' : '#fff',
        border:         'none',
        borderRadius:   '12px',
        fontSize:       '15px',
        fontWeight:     700,
        cursor:         disabled ? 'not-allowed' : 'pointer',
        fontFamily:     "'DM Sans', sans-serif",
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        transition:     'background 0.2s',
        opacity:        loading ? 0.75 : 1,
        ...style,
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block',
          }} />
          Processing…
        </>
      ) : (
        <>
          <ShoppingBag size={16} />
          {disabled ? 'Out of Stock' : 'Buy Now'}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
