'use client';

import { useState } from 'react';

interface Props {
  value:     number;
  onChange?: (v: number) => void;
  size?:     number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 20, readonly = false }: Props) {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ display: 'flex', gap: 2, cursor: readonly ? 'default' : 'pointer' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star;
        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#f59e0b' : 'none'}
            stroke={filled ? '#f59e0b' : '#d1d5db'}
            strokeWidth={1.5}
            style={{ transition: 'all 0.1s', flexShrink: 0 }}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            onClick={() => !readonly && onChange?.(star)}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

// Static display — shows partial fill for decimals like 4.3
export function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        const percent = Math.round(fill * 100);
        const id = `grad-${star}-${rating}`;
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${percent}%`} stopColor="#f59e0b" />
                <stop offset={`${percent}%`} stopColor="#d1d5db" />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={`url(#${id})`}
              stroke="#f59e0b"
              strokeWidth={0.5}
            />
          </svg>
        );
      })}
    </div>
  );
}
