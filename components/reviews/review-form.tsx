'use client';

import { useState } from 'react';
import { StarRating } from './star-rating';
import { submitReview } from '@/action/reviewAction';
import { Loader2, CheckCircle } from 'lucide-react';

interface Props {
  orderId:      string;
  productTitle: string;
  onSuccess?:   () => void;
}

export function ReviewForm({ orderId, productTitle, onSuccess }: Props) {
  const [rating,     setRating]     = useState(0);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return setError('Please select a rating');
    setSubmitting(true);
    setError('');

    const result = await submitReview({ orderId, rating, reviewText: text || null });
    setSubmitting(false);

    if (result.error) return setError(result.error);

    setDone(true);
    onSuccess?.();
  };

  if (done) {
    return (
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 14, color: '#15803d', fontWeight: 600,
      }}>
        <CheckCircle size={16} /> Thanks for your review!
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 14, padding: 20,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>
        Rate your purchase
      </div>
      <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 16 }}>
        {productTitle}
      </div>

      {/* Stars */}
      <div style={{ marginBottom: 16 }}>
        <StarRating value={rating} onChange={setRating} size={28} />
        {rating > 0 && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </div>
        )}
      </div>

      {/* Text */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Share your experience (optional)..."
        maxLength={500}
        rows={3}
        style={{
          width: '100%', border: '1.5px solid #e5e7eb',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 13.5, fontFamily: 'DM Sans, sans-serif',
          resize: 'none', outline: 'none', marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {error && (
        <div style={{ fontSize: 12.5, color: '#dc2626', marginBottom: 10 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        style={{
          width: '100%', padding: '10px',
          background: rating === 0 ? '#e5e7eb' : '#16a34a',
          color: rating === 0 ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: 9,
          fontSize: 14, fontWeight: 700,
          cursor: rating === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 7,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.15s',
        }}
      >
        {submitting
          ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
          : 'Submit Review'}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </button>
    </div>
  );
}
