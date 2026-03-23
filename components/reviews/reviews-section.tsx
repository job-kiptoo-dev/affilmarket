import { getProductReviews, getProductRatingSummary } from '@/action/reviewAction';
import { StarDisplay } from './star-rating';

interface Props {
  productId: string;
}

export async function ReviewsSection({ productId }: Props) {
  const [summary, reviewList] = await Promise.all([
    getProductRatingSummary(productId),
    getProductReviews(productId),
  ]);

  const avg   = Number(summary?.avgRating   ?? 0);
  const total = Number(summary?.totalReviews ?? 0);

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 16, padding: 24,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Customer Reviews
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 }}>
          No reviews yet — be the first to review this product.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {avg.toFixed(1)}
              </div>
              <StarDisplay rating={avg} size={18} />
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                {total} review{total !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Bar breakdown */}
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(summary?.[['', 'one', 'two', 'three', 'four', 'five'][star] as keyof typeof summary] ?? 0);
                const pct   = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 600, width: 8 }}>{star}</span>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="#f59e0b">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 100, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: '#9ca3af', width: 16, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviewList.map((r) => (
              <div key={r.id} style={{ paddingBottom: 16, borderBottom: '1px solid #f9fafb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <StarDisplay rating={r.rating} size={14} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-KE', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                {r.reviewText && (
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {r.reviewText}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
