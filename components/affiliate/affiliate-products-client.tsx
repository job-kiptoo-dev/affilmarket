'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Copy, CheckCheck, ExternalLink,
  TrendingUp, Package, Filter, X, ChevronDown,
} from 'lucide-react';

interface Product {
  id:                     string;
  title:                  string;
  slug:                   string;
  price:                  number;
  mainImageUrl:           string | null;
  shortDescription:       string | null;
  affiliateCommissionRate: number;
  country:                string;
  shopName:               string;
  categoryName:           string | null;
}

interface Props {
  products:        Product[];
  categories:      { id: string; name: string }[];
  affiliateToken:  string;
  initialSearch:   string;
  initialCategory: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

function commissionAmount(price: number, rate: number) {
  return (price * rate).toFixed(0);
}

function formatKES(n: number) {
  return `KES ${n.toLocaleString('en-KE')}`;
}

export function AffiliateProductsClient({
  products, categories, affiliateToken,
  initialSearch, initialCategory,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [search,   setSearch]   = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort,     setSort]     = useState<'commission' | 'price_asc' | 'price_desc'>('commission');
  const [copied,   setCopied]   = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search)   list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.shortDescription?.toLowerCase().includes(search.toLowerCase()));
    if (category) list = list.filter(p => p.categoryName === categories.find(c => c.id === category)?.name);
    if (sort === 'commission') list.sort((a, b) => b.affiliateCommissionRate - a.affiliateCommissionRate);
    if (sort === 'price_asc')  list.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, search, category, sort, categories]);

  const copyLink = async (slug: string) => {
    const url = `${BASE_URL}/products/${slug}?aff=${affiliateToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const topCommission = Math.max(...products.map(p => p.affiliateCommissionRate));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Mulish:wght@400;500;600;700&display=swap');

        .ap-page { font-family: 'Mulish', sans-serif; }

        /* ── HEADER ── */
        .ap-header { margin-bottom: 28px; }
        .ap-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px; font-weight: 800; color: #111;
          letter-spacing: -0.04em; margin-bottom: 6px;
        }
        .ap-subtitle { font-size: 14px; color: #6b7280; }

        /* ── STAT PILLS ── */
        .ap-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
        .ap-stat-pill {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 100px; padding: 8px 16px;
          font-size: 13px; font-weight: 600; color: #374151;
        }
        .ap-stat-pill .val { color: #16a34a; font-weight: 800; }

        /* ── CONTROLS ── */
        .ap-controls {
          display: flex; gap: 10px; margin-bottom: 24px;
          flex-wrap: wrap; align-items: center;
        }
        .ap-search-wrap {
          flex: 1; min-width: 240px; position: relative;
        }
        .ap-search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #9ca3af;
          pointer-events: none;
        }
        .ap-search {
          width: 100%; padding: 11px 14px 11px 40px;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          font-size: 14px; font-family: 'Mulish', sans-serif;
          outline: none; transition: border-color 0.15s;
          background: #fff;
        }
        .ap-search:focus { border-color: #16a34a; }
        .ap-search:focus + .ap-search-clear { display: flex; }

        .ap-select {
          padding: 11px 36px 11px 14px; border: 1.5px solid #e5e7eb;
          border-radius: 12px; font-size: 13.5px; font-weight: 600;
          font-family: 'Mulish', sans-serif; color: #374151;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
          appearance: none; outline: none; cursor: pointer;
          transition: border-color 0.15s; min-width: 160px;
        }
        .ap-select:focus { border-color: #16a34a; }

        .ap-count {
          font-size: 13px; color: #9ca3af; font-weight: 600;
          white-space: nowrap; padding: 0 4px;
        }

        /* ── GRID ── */
        .ap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }

        /* ── PRODUCT CARD ── */
        .ap-card {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 16px; overflow: hidden;
          transition: all 0.2s; display: flex; flex-direction: column;
        }
        .ap-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 8px 24px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }

        .ap-card-img {
          aspect-ratio: 16/10; background: #f3f4f6;
          overflow: hidden; position: relative; flex-shrink: 0;
        }
        .ap-card-img img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.4s;
        }
        .ap-card:hover .ap-card-img img { transform: scale(1.04); }

        .ap-card-img-placeholder {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 40px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
        }

        /* Commission badge on image */
        .ap-comm-badge {
          position: absolute; top: 10px; right: 10px;
          background: #16a34a; color: #fff;
          font-size: 12px; font-weight: 800;
          border-radius: 8px; padding: 4px 10px;
          font-family: 'Bricolage Grotesque', sans-serif;
          letter-spacing: 0.02em;
        }
        .ap-comm-badge.hot {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          animation: pulse-badge 2s ease-in-out infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }

        .ap-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; }

        .ap-card-meta {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 8px;
        }
        .ap-card-category {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #9ca3af;
        }
        .ap-card-dot { width: 3px; height: 3px; background: #d1d5db; border-radius: 50%; }
        .ap-card-shop { font-size: 11px; color: #9ca3af; font-weight: 600; }

        .ap-card-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 15px; font-weight: 700; color: #111;
          letter-spacing: -0.02em; margin-bottom: 6px;
          line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .ap-card-desc {
          font-size: 12.5px; color: #6b7280; line-height: 1.5;
          margin-bottom: 14px; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }

        /* Earnings row */
        .ap-earnings-row {
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 10px; padding: 10px 12px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .ap-earnings-label { font-size: 11px; color: #15803d; font-weight: 600; }
        .ap-earnings-amount {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 18px; font-weight: 800; color: #16a34a;
          letter-spacing: -0.03em;
        }
        .ap-price { font-size: 11.5px; color: #6b7280; margin-top: 1px; }

        /* Action buttons */
        .ap-actions { display: flex; gap: 8px; }
        .ap-btn-copy {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all 0.15s; font-family: 'Mulish', sans-serif;
          border: none;
        }
        .ap-btn-copy.idle {
          background: #111; color: #fff;
        }
        .ap-btn-copy.idle:hover { background: #16a34a; }
        .ap-btn-copy.done {
          background: #f0fdf4; color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .ap-btn-preview {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 9px;
          border: 1.5px solid #e5e7eb; background: #fff;
          color: #6b7280; cursor: pointer; transition: all 0.15s;
          text-decoration: none; flex-shrink: 0;
        }
        .ap-btn-preview:hover { border-color: #374151; color: #111; }

        /* ── EMPTY ── */
        .ap-empty {
          grid-column: 1 / -1; text-align: center;
          padding: 80px 20px;
        }
        .ap-empty-icon {
          font-size: 52px; margin-bottom: 16px;
          display: block;
        }
        .ap-empty-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 20px; font-weight: 700; color: #374151; margin-bottom: 6px;
        }
        .ap-empty-desc { font-size: 14px; color: #9ca3af; }

        @media (max-width: 640px) {
          .ap-grid { grid-template-columns: 1fr; }
          .ap-controls { flex-direction: column; }
          .ap-search-wrap { min-width: unset; width: 100%; }
          .ap-select { width: 100%; }
        }
      `}</style>

      <div className="ap-page">

        {/* Header */}
        <div className="ap-header">
          <h1 className="ap-title">Products to Promote</h1>
          <p className="ap-subtitle">
            Copy your unique affiliate link in one click — earn commissions on every sale you drive.
          </p>
        </div>

        {/* Stats */}
        <div className="ap-stats">
          <div className="ap-stat-pill">
            <Package size={14} />
            <span><span className="val">{products.length}</span> products available</span>
          </div>
          <div className="ap-stat-pill">
            <TrendingUp size={14} />
            <span>Up to <span className="val">{(topCommission * 100).toFixed(0)}%</span> commission</span>
          </div>
          <div className="ap-stat-pill">
            <span>🔑 Your token:</span>
            <span className="val" style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              {affiliateToken}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="ap-controls">
          <div className="ap-search-wrap">
            <Search size={15} className="ap-search-icon" />
            <input
              className="ap-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="ap-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="ap-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="commission">Highest Commission</option>
            <option value="price_desc">Highest Price</option>
            <option value="price_asc">Lowest Price</option>
          </select>

          <span className="ap-count">{filtered.length} results</span>
        </div>

        {/* Grid */}
        <div className="ap-grid">
          {filtered.length === 0 ? (
            <div className="ap-empty">
              <span className="ap-empty-icon">🔍</span>
              <div className="ap-empty-title">No products found</div>
              <div className="ap-empty-desc">Try a different search or category filter</div>
            </div>
          ) : (
            filtered.map((p) => {
              const earn = commissionAmount(p.price, p.affiliateCommissionRate);
              const isHot = p.affiliateCommissionRate >= topCommission * 0.8;
              const isCopied = copied === p.slug;

              return (
                <div key={p.id} className="ap-card">
                  <div className="ap-card-img">
                    {p.mainImageUrl ? (
                      <img src={p.mainImageUrl} alt={p.title} />
                    ) : (
                      <div className="ap-card-img-placeholder">🛍️</div>
                    )}
                    <div className={`ap-comm-badge${isHot ? ' hot' : ''}`}>
                      {isHot ? '🔥 ' : ''}{(p.affiliateCommissionRate * 100).toFixed(0)}% comm
                    </div>
                  </div>

                  <div className="ap-card-body">
                    <div className="ap-card-meta">
                      {p.categoryName && (
                        <>
                          <span className="ap-card-category">{p.categoryName}</span>
                          <span className="ap-card-dot" />
                        </>
                      )}
                      <span className="ap-card-shop">{p.shopName}</span>
                    </div>

                    <div className="ap-card-title">{p.title}</div>
                    {p.shortDescription && (
                      <div className="ap-card-desc">{p.shortDescription}</div>
                    )}

                    <div className="ap-earnings-row">
                      <div>
                        <div className="ap-earnings-label">You earn per sale</div>
                        <div className="ap-price">Product price: {formatKES(p.price)}</div>
                      </div>
                      <div className="ap-earnings-amount">+KES {earn}</div>
                    </div>

                    <div className="ap-actions">
                      <button
                        className={`ap-btn-copy ${isCopied ? 'done' : 'idle'}`}
                        onClick={() => copyLink(p.slug)}
                      >
                        {isCopied ? (
                          <><CheckCheck size={13} /> Copied!</>
                        ) : (
                          <><Copy size={13} /> Copy Link</>
                        )}
                      </button>

                      <a
                        href={`/products/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ap-btn-preview"
                        title="Preview product"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
