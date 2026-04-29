'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus, Search, Filter, MoreHorizontal, Edit2, Trash2,
  Eye, Copy, TrendingUp, Package, CheckCircle,
  Clock, XCircle, FileText, ArrowUpRight, ChevronDown,
  LayoutGrid, List, AlertTriangle,
} from 'lucide-react';

// ── TYPES ────────────────────────────────────────────────────────────────────
type ProductStatus = 'active' | 'draft' | 'pending_approval' | 'rejected' | 'inactive';

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  stockQuantity: number;
  status: ProductStatus;
  mainImageUrl: string | null;
  affiliateCommissionRate: number;
  category: string | null;
  ordersCount: number;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  draft: number;
  pending: number;
  rejected: number;
}

interface Props {
  products: Product[];
  stats: Stats;
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  active:           { label: 'Active',           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={11} /> },
  draft:            { label: 'Draft',            color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: <FileText    size={11} /> },
  pending_approval: { label: 'Under Review',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Clock       size={11} /> },
  rejected:         { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle     size={11} /> },
  inactive:         { label: 'Inactive',         color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', icon: <Package     size={11} /> },
};

const FILTER_TABS = [
  { key: 'all',              label: 'All Products' },
  { key: 'active',           label: 'Active'       },
  { key: 'draft',            label: 'Draft'        },
  { key: 'pending_approval', label: 'Under Review' },
  { key: 'rejected',         label: 'Rejected'     },
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first'    },
  { value: 'oldest',    label: 'Oldest first'    },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc',label: 'Price: high → low' },
  { value: 'orders',    label: 'Most orders'     },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

function commPct(rate: number) {
  return rate > 1 ? rate.toFixed(0) : (rate * 100).toFixed(0);
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function VendorProductsClient({ products, stats }: Props) {
  const [activeTab,  setActiveTab]  = useState('all');
  const [search,     setSearch]     = useState('');
  const [sortBy,     setSortBy]     = useState('newest');
  const [viewMode,   setViewMode]   = useState<'table' | 'grid'>('table');
  const [openMenu,   setOpenMenu]   = useState<string | null>(null);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...products];

    if (activeTab !== 'all') {
      list = list.filter((p) => p.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'oldest':     list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
      case 'price_asc':  list.sort((a, b) => a.price - b.price);                      break;
      case 'price_desc': list.sort((a, b) => b.price - a.price);                      break;
      case 'orders':     list.sort((a, b) => b.ordersCount - a.ordersCount);          break;
      default:           list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }

    return list;
  }, [products, activeTab, search, sortBy]);

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        .vp-page { font-family: 'DM Sans', -apple-system, sans-serif; }

        /* ── HEADER ── */
        .vp-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap;
          gap: 16px; margin-bottom: 28px;
        }
        .vp-title {
          font-size: 26px; font-weight: 800; color: #111;
          letter-spacing: -0.04em; line-height: 1.1;
        }
        .vp-subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }

        .vp-btn-outline {
          display: inline-flex; align-items: center; gap: 7px;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 9px 16px; font-size: 13.5px; font-weight: 600; color: #374151;
          cursor: pointer; text-decoration: none; transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .vp-btn-outline:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

        .vp-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: #16a34a; border: none; border-radius: 8px;
          padding: 9px 18px; font-size: 13.5px; font-weight: 700; color: #fff;
          cursor: pointer; text-decoration: none; transition: background 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .vp-btn-primary:hover { background: #15803d; }

        /* ── STAT STRIP ── */
        .vp-stat-strip {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 12px; margin-bottom: 24px;
        }
        .vp-stat-tile {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 12px; padding: 16px 18px;
          transition: box-shadow 0.2s;
          cursor: pointer;
        }
        .vp-stat-tile:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
        .vp-stat-tile.selected { border-color: #16a34a; background: #f0fdf4; }

        .vp-stat-tile-value {
          font-size: 26px; font-weight: 800; color: #111;
          letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 2px;
        }
        .vp-stat-tile.selected .vp-stat-tile-value { color: #16a34a; }
        .vp-stat-tile-label {
          font-size: 12px; color: #6b7280; font-weight: 500;
        }

        /* ── TOOLBAR ── */
        .vp-toolbar {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap; margin-bottom: 16px;
        }

        .vp-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 9px;
          padding: 9px 14px; flex: 1; min-width: 200px; max-width: 340px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vp-search-wrap:focus-within {
          border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.08);
        }
        .vp-search-input {
          border: none; outline: none; background: transparent;
          font-size: 13.5px; color: #111; width: 100%;
          font-family: 'DM Sans', sans-serif;
        }
        .vp-search-input::placeholder { color: #9ca3af; }

        .vp-filter-tabs {
          display: flex; gap: 4px;
          background: #f3f4f6; border-radius: 9px; padding: 3px;
        }
        .vp-filter-tab {
          padding: 6px 13px; border-radius: 7px;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; color: #6b7280; white-space: nowrap;
          border: none; background: none; font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 5px;
        }
        .vp-filter-tab:hover { color: #374151; }
        .vp-filter-tab.active {
          background: #fff; color: #111;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .vp-filter-count {
          background: #e5e7eb; color: #6b7280;
          border-radius: 100px; padding: 1px 6px;
          font-size: 10.5px; font-weight: 700;
        }
        .vp-filter-tab.active .vp-filter-count { background: #dcfce7; color: #16a34a; }

        .vp-sort-wrap { position: relative; }
        .vp-sort-btn {
          display: flex; align-items: center; gap: 7px;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 9px 14px; font-size: 13px; font-weight: 600; color: #374151;
          cursor: pointer; white-space: nowrap; transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .vp-sort-btn:hover { border-color: #d1d5db; }

        .vp-sort-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          padding: 5px; min-width: 190px; z-index: 50;
          animation: dpIn 0.14s ease;
        }
        @keyframes dpIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vp-sort-item {
          padding: 8px 12px; border-radius: 7px;
          font-size: 13.5px; font-weight: 500; color: #374151;
          cursor: pointer; transition: background 0.12s;
          font-family: 'DM Sans', sans-serif;
        }
        .vp-sort-item:hover { background: #f9fafb; }
        .vp-sort-item.selected { background: #f0fdf4; color: #16a34a; font-weight: 700; }

        .vp-view-toggle {
          display: flex; background: #f3f4f6;
          border-radius: 8px; padding: 3px; gap: 2px;
        }
        .vp-view-btn {
          padding: 6px 10px; border-radius: 6px;
          cursor: pointer; transition: all 0.15s;
          border: none; background: none; color: #9ca3af;
          display: flex; align-items: center;
        }
        .vp-view-btn.active { background: #fff; color: #111; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* ── TABLE ── */
        .vp-table-wrap {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
        }

        .vp-table { width: 100%; border-collapse: collapse; }
        .vp-table th {
          text-align: left; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af;
          padding: 13px 16px; border-bottom: 1px solid #f3f4f6;
          background: #fafafa; white-space: nowrap;
        }
        .vp-table th:first-child { padding-left: 20px; }
        .vp-table td {
          padding: 14px 16px; font-size: 13.5px; color: #374151;
          border-bottom: 1px solid #f9fafb; vertical-align: middle;
        }
        .vp-table td:first-child { padding-left: 20px; }
        .vp-table tr:last-child td { border-bottom: none; }
        .vp-table tbody tr:hover td { background: #fafafa; }

        .vp-product-img {
          width: 44px; height: 44px; border-radius: 8px;
          object-fit: cover; flex-shrink: 0;
          border: 1px solid #e5e7eb; background: #f9fafb;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; overflow: hidden;
        }

        .vp-product-title {
          font-weight: 700; color: #111; font-size: 13.5px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 220px; display: block; letter-spacing: -0.01em;
        }
        .vp-product-title:hover { color: #16a34a; }

        .vp-product-category {
          font-size: 11.5px; color: #9ca3af; margin-top: 2px;
          font-weight: 500;
        }

        .vp-status-pill {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 100px; padding: 4px 10px;
          font-size: 11.5px; font-weight: 700; white-space: nowrap;
        }

        .vp-price { font-weight: 800; color: #111; font-size: 14px; letter-spacing: -0.02em; }
        .vp-commission { font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 2px; }

        .vp-orders-count {
          font-size: 14px; font-weight: 700; color: #111;
        }
        .vp-stock {
          font-size: 13px; font-weight: 600;
        }
        .vp-stock.low { color: #dc2626; }
        .vp-stock.ok  { color: #16a34a; }

        /* ── ACTION MENU ── */
        .vp-action-btn {
          width: 32px; height: 32px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #e5e7eb; background: #fff; cursor: pointer;
          transition: all 0.15s; color: #6b7280;
        }
        .vp-action-btn:hover { border-color: #d1d5db; background: #f9fafb; color: #111; }

        .vp-action-wrap { position: relative; }
        .vp-action-menu {
          position: absolute; right: 0; top: calc(100% + 4px);
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          padding: 5px; min-width: 170px; z-index: 50;
          animation: dpIn 0.14s ease;
        }
        .vp-action-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 11px; border-radius: 7px;
          font-size: 13.5px; font-weight: 500; color: #374151;
          cursor: pointer; transition: background 0.12s;
          text-decoration: none; font-family: 'DM Sans', sans-serif;
          border: none; background: none; width: 100%; text-align: left;
        }
        .vp-action-item:hover { background: #f9fafb; color: #111; }
        .vp-action-item.danger:hover { background: #fef2f2; color: #dc2626; }
        .vp-action-divider { height: 1px; background: #f3f4f6; margin: 4px 0; }

        /* ── GRID VIEW ── */
        .vp-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .vp-grid-card {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px; overflow: hidden;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .vp-grid-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }

        .vp-grid-img {
          width: 100%; aspect-ratio: 16/9;
          background: #f9fafb; display: flex; align-items: center;
          justify-content: center; font-size: 40px; position: relative;
          overflow: hidden;
        }

        .vp-grid-status {
          position: absolute; top: 10px; left: 10px;
        }

        .vp-grid-body { padding: 14px 16px; }
        .vp-grid-title {
          font-size: 14px; font-weight: 700; color: #111;
          letter-spacing: -0.02em; margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vp-grid-cat { font-size: 12px; color: #9ca3af; margin-bottom: 12px; }

        .vp-grid-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-top: 1px solid #f3f4f6;
        }

        /* ── EMPTY STATE ── */
        .vp-empty {
          text-align: center; padding: 72px 20px;
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 14px;
        }
        .vp-empty-icon {
          width: 64px; height: 64px; border-radius: 16px;
          background: #f3f4f6; display: flex; align-items: center;
          justify-content: center; font-size: 30px;
          margin: 0 auto 16px;
        }
        .vp-empty-title { font-size: 17px; font-weight: 700; color: #374151; margin-bottom: 6px; }
        .vp-empty-desc  { font-size: 14px; color: #9ca3af; margin-bottom: 24px; }

        /* ── RESULTS BAR ── */
        .vp-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
        }
        .vp-results-text { font-size: 13px; color: #6b7280; }
        .vp-results-text strong { color: #111; font-weight: 700; }

        /* ── DELETE MODAL ── */
        .vp-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .vp-modal {
          background: #fff; border-radius: 16px;
          padding: 28px; width: 100%; max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: scaleIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .vp-modal-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: #fef2f2; display: flex; align-items: center;
          justify-content: center; margin-bottom: 16px;
        }
        .vp-modal-title { font-size: 17px; font-weight: 800; color: #111; margin-bottom: 8px; letter-spacing: -0.02em; }
        .vp-modal-desc  { font-size: 14px; color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
        .vp-modal-actions { display: flex; gap: 10px; }
        .vp-modal-cancel {
          flex: 1; padding: 10px; border-radius: 8px;
          border: 1px solid #e5e7eb; background: #fff;
          font-size: 14px; font-weight: 600; color: #374151;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .vp-modal-cancel:hover { background: #f9fafb; }
        .vp-modal-delete {
          flex: 1; padding: 10px; border-radius: 8px;
          border: none; background: #dc2626;
          font-size: 14px; font-weight: 700; color: #fff;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.2s;
        }
        .vp-modal-delete:hover { background: #b91c1c; }

        @media (max-width: 1100px) {
          .vp-stat-strip { grid-template-columns: repeat(3, 1fr); }
          .vp-filter-tabs { display: none; }
        }
        @media (max-width: 768px) {
          .vp-stat-strip { grid-template-columns: 1fr 1fr; }
          .vp-title { font-size: 22px; }
          .vp-header { flex-direction: column; }
          .vp-table th:nth-child(4),
          .vp-table td:nth-child(4),
          .vp-table th:nth-child(6),
          .vp-table td:nth-child(6) { display: none; }
        }
      `}</style>

      <div className="vp-page" onClick={() => { setOpenMenu(null); setSortOpen(false); }}>

        {/* ── PAGE HEADER ── */}
        <div className="vp-header">
          <div>
            <h1 className="vp-title">Products</h1>
            <p className="vp-subtitle">Manage your product listings across the marketplace</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/vendor/products/new" className="vp-btn-primary">
              <Plus size={15} /> Add Product
            </Link>
          </div>
        </div>

        {/* ── STAT STRIP ── */}
        <div className="vp-stat-strip">
          {[
            { key: 'all',              value: stats.total,    label: 'Total',       color: '#111'    },
            { key: 'active',           value: stats.active,   label: 'Active',      color: '#16a34a' },
            { key: 'draft',            value: stats.draft,    label: 'Drafts',      color: '#6b7280' },
            { key: 'pending_approval', value: stats.pending,  label: 'Under Review',color: '#d97706' },
            { key: 'rejected',         value: stats.rejected, label: 'Rejected',    color: '#dc2626' },
          ].map((s) => (
            <div
              key={s.key}
              className={`vp-stat-tile${activeTab === s.key ? ' selected' : ''}`}
              onClick={() => setActiveTab(s.key)}
            >
              <div className="vp-stat-tile-value" style={{ color: activeTab === s.key ? s.color : '#111' }}>
                {s.value}
              </div>
              <div className="vp-stat-tile-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="vp-toolbar">
          {/* Search */}
          <div className="vp-search-wrap">
            <Search size={14} color="#9ca3af" />
            <input
              className="vp-search-input"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter tabs */}
          <div className="vp-filter-tabs">
            {FILTER_TABS.map((t) => {
              const count =
                t.key === 'all'              ? stats.total    :
                t.key === 'active'           ? stats.active   :
                t.key === 'draft'            ? stats.draft    :
                t.key === 'pending_approval' ? stats.pending  :
                                               stats.rejected;
              return (
                <button
                  key={t.key}
                  className={`vp-filter-tab${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                  <span className="vp-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Sort */}
          <div className="vp-sort-wrap" onClick={(e) => e.stopPropagation()}>
            <button className="vp-sort-btn" onClick={() => setSortOpen(!sortOpen)}>
              <Filter size={13} /> {currentSort.label} <ChevronDown size={12} />
            </button>
            {sortOpen && (
              <div className="vp-sort-dropdown">
                {SORT_OPTIONS.map((o) => (
                  <div
                    key={o.value}
                    className={`vp-sort-item${sortBy === o.value ? ' selected' : ''}`}
                    onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                  >
                    {o.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="vp-view-toggle">
            <button
              className={`vp-view-btn${viewMode === 'table' ? ' active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <List size={15} />
            </button>
            <button
              className={`vp-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* ── RESULTS BAR ── */}
        <div className="vp-results-bar">
          <span className="vp-results-text">
            Showing <strong>{filtered.length}</strong> of <strong>{stats.total}</strong> products
            {search && <> matching <strong>"{search}"</strong></>}
          </span>
        </div>

        {/* ── EMPTY STATE ── */}
        {filtered.length === 0 && (
          <div className="vp-empty">
            <div className="vp-empty-icon">
              {search ? '🔍' : '📦'}
            </div>
            <div className="vp-empty-title">
              {search ? 'No products found' : 'No products yet'}
            </div>
            <div className="vp-empty-desc">
              {search
                ? `No products match "${search}". Try a different search term.`
                : 'Start building your store by adding your first product.'}
            </div>
            {!search && (
              <Link href="/vendor/products/new/" className="vp-btn-primary" style={{ display: 'inline-flex' }}>
                <Plus size={15} /> Add Your First Product
              </Link>
            )}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {filtered.length > 0 && viewMode === 'table' && (
          <div className="vp-table-wrap">
            <table className="vp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Orders</th>
                  <th>Commission</th>
                  <th>Listed</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const st = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.inactive;
                  const isLowStock = product.stockQuantity <= 5;
                  return (
                    <tr key={product.id}>
                      {/* Product */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="vp-product-img">
                            {product.mainImageUrl ? (
                              <Image
                                src={product.mainImageUrl}
                                alt={product.title}
                                width={44} height={44}
                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                              />
                            ) : '📦'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/vendor/products/${product.id}/edit`} className="vp-product-title">
                              {product.title}
                            </Link>
                            <div className="vp-product-category">
                              {product.category ?? 'Uncategorised'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="vp-status-pill"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                        >
                          {st.icon} {st.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td>
                        <div className="vp-price">{fmt(product.price)}</div>
                        {product.affiliateCommissionRate > 0 && (
                          <div className="vp-commission">
                            {commPct(product.affiliateCommissionRate)}% comm.
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td>
                        <span className={`vp-stock${isLowStock ? ' low' : ' ok'}`}>
                          {isLowStock && <AlertTriangle size={12} style={{ display: 'inline', marginRight: 3 }} />}
                          {product.stockQuantity} units
                        </span>
                      </td>

                      {/* Orders */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="vp-orders-count">{product.ordersCount}</span>
                          {product.ordersCount > 0 && (
                            <Link
                              href={`/vendor/orders?product=${product.id}`}
                              style={{ color: '#9ca3af' }}
                            >
                              <ArrowUpRight size={13} />
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Commission */}
                      <td>
                        {product.affiliateCommissionRate > 0 ? (
                          <span style={{
                            background: '#f0fdf4', color: '#16a34a',
                            border: '1px solid #bbf7d0',
                            borderRadius: 100, padding: '3px 9px',
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {commPct(product.affiliateCommissionRate)}%
                          </span>
                        ) : (
                          <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {new Date(product.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="vp-action-wrap">
                          <button
                            className="vp-action-btn"
                            onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {openMenu === product.id && (
                            <div className="vp-action-menu">
                              <Link href={`/products/${product.slug}`} className="vp-action-item">
                                <Eye size={14} color="#6b7280" /> View Live
                              </Link>
                              <Link href={`/vendor/products/${product.id}/edit`} className="vp-action-item">
                                <Edit2 size={14} color="#6b7280" /> Edit Product
                              </Link>
                              <button
                                className="vp-action-item"
                                onClick={() => {
                                  navigator.clipboard?.writeText(
                                    `${window.location.origin}/products/${product.slug}`
                                  );
                                  setOpenMenu(null);
                                }}
                              >
                                <Copy size={14} color="#6b7280" /> Copy Link
                              </button>
                              <Link href={`/vendor/products/${product.id}/analytics`} className="vp-action-item">
                                <TrendingUp size={14} color="#6b7280" /> Analytics
                              </Link>
                              <div className="vp-action-divider" />
                              <button
                                className="vp-action-item danger"
                                onClick={() => { setDeleteId(product.id); setOpenMenu(null); }}
                              >
                                <Trash2 size={14} color="#dc2626" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="vp-grid">
            {filtered.map((product) => {
              const st = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.inactive;
              return (
                <div key={product.id} className="vp-grid-card">
                  <div className="vp-grid-img">
                    {product.mainImageUrl ? (
                      <Image
                        src={product.mainImageUrl}
                        alt={product.title}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : '📦'}
                    <div className="vp-grid-status">
                      <span
                        className="vp-status-pill"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                      >
                        {st.icon} {st.label}
                      </span>
                    </div>
                  </div>

                  <div className="vp-grid-body">
                    <div className="vp-grid-title">{product.title}</div>
                    <div className="vp-grid-cat">{product.category ?? 'Uncategorised'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="vp-price" style={{ fontSize: 16 }}>{fmt(product.price)}</div>
                        {product.affiliateCommissionRate > 0 && (
                          <div className="vp-commission">{commPct(product.affiliateCommissionRate)}% affiliate</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                          {product.ordersCount} orders
                        </div>
                        <div style={{ fontSize: 11.5, color: product.stockQuantity <= 5 ? '#dc2626' : '#9ca3af', marginTop: 2 }}>
                          {product.stockQuantity} in stock
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vp-grid-footer">
                    <Link
                      href={`/vendor/products/${product.id}/edit`}
                      className="vp-btn-outline"
                      style={{ padding: '7px 13px', fontSize: 12.5 }}
                    >
                      <Edit2 size={12} /> Edit
                    </Link>
                    <Link
                      href={`/products/${product.slug}`}
                      className="vp-btn-outline"
                      style={{ padding: '7px 13px', fontSize: 12.5 }}
                    >
                      <Eye size={12} /> View
                    </Link>
                    <button
                      className="vp-action-btn"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(product.id); }}
                      title="Delete"
                      style={{ borderColor: '#fecaca', color: '#dc2626' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DELETE CONFIRM MODAL ── */}
        {deleteId && (
          <div className="vp-modal-overlay" onClick={() => setDeleteId(null)}>
            <div className="vp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vp-modal-icon">
                <Trash2 size={22} color="#dc2626" />
              </div>
              <div className="vp-modal-title">Delete Product?</div>
              <div className="vp-modal-desc">
                This will permanently remove{' '}
                <strong>
                  {filtered.find((p) => p.id === deleteId)?.title ?? 'this product'}
                </strong>{' '}
                from the marketplace. This action cannot be undone.
              </div>
              <div className="vp-modal-actions">
                <button className="vp-modal-cancel" onClick={() => setDeleteId(null)}>
                  Cancel
                </button>
                <button
                  className="vp-modal-delete"
                  onClick={async () => {
                    // TODO: call DELETE /api/vendor/products/:id
                    setDeleteId(null);
                  }}
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
