'use client';

import { useState } from 'react';

interface Props {
  mainImageUrl: string | null;
  galleryImages: string[] | null;
  title: string;
}

export function ProductImages({ mainImageUrl, galleryImages, title }: Props) {
  // Build the full list: main image first, then gallery
  const all = [
    ...(mainImageUrl ? [mainImageUrl] : []),
    ...(galleryImages ?? []),
  ];

  const [active, setActive] = useState(all[0] ?? null);

  return (
    <>
      <style>{`
        .pp-thumb {
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
          cursor: pointer;
          background: #f3f4f6;
          transition: border-color 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .pp-thumb:hover  { border-color: #86efac; transform: scale(1.03); }
        .pp-thumb.active { border-color: #16a34a; }
        .pp-thumb img    { width: 100%; height: 100%; object-fit: cover; display: block; }
      `}</style>

      <div className="pp-images">
        {/* ── Main image ── */}
        <div className="pp-main-img">
          {active
            ? <img src={active} alt={title} />
            : <div className="pp-main-img-placeholder">🛍️</div>}
        </div>

        {/* ── Thumbnails — only render if there's more than one image ── */}
        {all.length > 1 && (
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {all.map((url, i) => (
              <div
                key={url}
                className={`pp-thumb${active === url ? ' active' : ''}`}
                style={{ width: 64, height: 64 }}
                onClick={() => setActive(url)}
                title={`Image ${i + 1}`}
              >
                <img src={url} alt={`${title} — image ${i + 1}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
