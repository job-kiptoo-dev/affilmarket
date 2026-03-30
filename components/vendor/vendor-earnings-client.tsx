'use client';

import { useState }  from 'react';
import Link          from 'next/link';
import {
  TrendingUp, Wallet, Package, ShoppingCart,
  ArrowUpRight, ChevronRight, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id:                  string;
  createdAt:           string;
  totalAmount:         number;
  vendorEarnings:      number;
  platformFee:         number;
  affiliateCommission: number;
  orderStatus:         string;
  paymentStatus:       string;
  customerName:        string;
  quantity:            number;
  productTitle:        string;
  productImage:        string | null;
}

interface TopProduct {
  id:            string;
  title:         string;
  image:         string | null;
  orderCount:    number;
  totalEarnings: number;
  unitsSold:     number;
}

interface MonthlySale {
  month:    string;
  earnings: number;
  revenue:  number;
  orders:   number;
}

export interface VendorEarningsData {
  shopName:          string;
  availableBalance:  number;
  pendingBalance:    number;
  paidOutTotal:      number;
  totalEarnings:     number;
  totalRevenue:      number;
  totalFees:         number;
  totalCommissions:  number;
  totalOrders:       number;
  paidOrders:        number;
  orders:            Order[];
  topProducts:       TopProduct[];
  monthlySales:      MonthlySale[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtSmall(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `KES ${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}

const ORDER_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  CREATED:   { bg: '#fffbeb', color: '#d97706' },
  PAID:      { bg: '#eff6ff', color: '#2563eb' },
  CONFIRMED: { bg: '#f5f3ff', color: '#7c3aed' },
  SHIPPED:   { bg: '#fff7ed', color: '#ea580c' },
  DELIVERED: { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: MonthlySale[] }) {
  const max = Math.max(...data.map(d => d.earnings), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9ca3af', fontSize: 13 }}>
        No sales data yet
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tooltip */}
      {hovered !== null && data[hovered] && (
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#fff', borderRadius: 8, padding: '7px 12px',
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 10,
          pointerEvents: 'none',
        }}>
          {data[hovered].month}: {fmt(data[hovered].earnings)} · {data[hovered].orders} orders
        </div>
      )}

      {/* Bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 24 }}>
        {data.map((d, i) => {
          const pct = (d.earnings / max) * 100;
          const isHov = hovered === i;
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0',
                height: `${Math.max(pct, 4)}%`,
                background: isHov
                  ? 'linear-gradient(180deg, #16a34a, #15803d)'
                  : 'linear-gradient(180deg, #86efac, #4ade80)',
                transition: 'background 0.15s, transform 0.15s',
                transform: isHov ? 'scaleY(1.03)' : 'scaleY(1)',
                transformOrigin: 'bottom',
              }} />
              <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.02em' }}>
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Earnings breakdown donut ─────────────────────────────────────────────────
function EarningsDonut({ earnings, fees, commissions }: { earnings: number; fees: number; commissions: number }) {
  const total = earnings + fees + commissions || 1;
  const earningsPct    = (earnings    / total) * 100;
  const feesPct        = (fees        / total) * 100;
  const commissionsPct = (commissions / total) * 100;

  // SVG donut
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circ = 2 * Math.PI * r;

  const segments = [
    { pct: earningsPct,    color: '#16a34a', label: 'Your Earnings' },
    { pct: feesPct,        color: '#e5e7eb', label: 'Platform Fee' },
    { pct: commissionsPct, color: '#fbbf24', label: 'Affiliate Commission' },
  ];

  let offset = 0;
  const arcs = segments.map(seg => {
    const dash    = (seg.pct / 100) * circ;
    const gap     = circ - dash;
    const rot     = offset;
    offset += (seg.pct / 100) * 360;
    return { ...seg, dash, gap, rot };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ flexShrink: 0 }}>
        <svg width={128} height={128} viewBox="0 0 128 128">
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={16}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={circ * 0.25}
              transform={`rotate(${arc.rot} ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="#9ca3af">YOURS</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={13} fontWeight={800} fill="#16a34a">
            {earningsPct.toFixed(0)}%
          </text>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { label: 'Your Earnings',       color: '#16a34a', value: earnings },
          { label: 'Platform Fee (5%)',   color: '#e5e7eb', value: fees, border: '#d1d5db' },
          { label: 'Affiliate Commission',color: '#fbbf24', value: commissions },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3,
              background: item.color,
              border: item.border ? `1px solid ${item.border}` : undefined,
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: '#111', fontWeight: 800 }}>{fmt(item.value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VendorEarningsClient({ data }: { data: VendorEarningsData }) {
  const [tab, setTab] = useState<'all' | 'paid' | 'pending'>('all');

  const filteredOrders = data.orders.filter(o => {
    if (tab === 'paid')    return o.paymentStatus === 'PAID';
    if (tab === 'pending') return o.paymentStatus === 'PENDING';
    return true;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .ve { font-family: 'DM Sans', -apple-system, sans-serif; }
        .ve-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .ve-sub   { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }

        /* Stat grid */
        .ve-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
        .ve-stat  { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; }
        .ve-stat.green { background: #f0fdf4; border-color: #86efac; }
        .ve-stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 6px; }
        .ve-stat-value { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .ve-stat-value.green { color: #16a34a; }
        .ve-stat-hint  { font-size: 12px; color: #9ca3af; margin-top: 4px; }

        /* Two col grid */
        .ve-grid2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-bottom: 20px; }
        .ve-grid2b { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }

        /* Cards */
        .ve-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .ve-card-head { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .ve-card-title { font-size: 14px; font-weight: 700; color: #111; }
        .ve-card-body  { padding: 20px; }
        .ve-link { font-size: 12.5px; color: #16a34a; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .ve-link:hover { text-decoration: underline; }

        /* Balance row */
        .ve-balrow { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 20px; }
        .ve-bal { border-radius: 12px; padding: 16px 18px; border: 1px solid #e5e7eb; background: #fff; }
        .ve-bal-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
        .ve-bal-val { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.04em; }

        /* Tabs */
        .ve-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; margin-bottom: 0; }
        .ve-tab  { padding: 10px 16px; font-size: 13px; font-weight: 600; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .ve-tab.active { color: #111; border-bottom-color: #111; }

        /* Orders table */
        .ve-table { width: 100%; border-collapse: collapse; }
        .ve-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 12px 12px; border-bottom: 1px solid #f3f4f6; }
        .ve-table th:first-child { padding-left: 0; }
        .ve-table td { padding: 13px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .ve-table td:first-child { padding-left: 0; }
        .ve-table tr:last-child td { border-bottom: none; }
        .ve-pill { display: inline-flex; align-items: center; border-radius: 100px; padding: 2px 9px; font-size: 11px; font-weight: 700; }

        /* Product row */
        .ve-prod-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f9fafb; }
        .ve-prod-row:last-child { border-bottom: none; }
        .ve-prod-img { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; overflow: hidden; flex-shrink: 0; }
        .ve-prod-img img { width: 100%; height: 100%; object-fit: cover; }

        /* Empty */
        .ve-empty { text-align: center; padding: 40px; color: #9ca3af; font-size: 13.5px; }

        /* Payout CTA banner */
        .ve-payout-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }

        @media (max-width: 1100px) { .ve-stats { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 900px)  { .ve-grid2, .ve-grid2b { grid-template-columns: 1fr; } }
        @media (max-width: 640px)  { .ve-stats, .ve-balrow { grid-template-columns: 1fr; } }
      `}</style>

      <div className="ve">
        <h1 className="ve-title">Earnings</h1>
        <p className="ve-sub">Your revenue breakdown, order history and balance overview.</p>

        {/* Payout CTA */}
        {data.availableBalance >= 100 && (
          <div className="ve-payout-banner">
            <span style={{ fontSize: 13.5, color: '#15803d', fontWeight: 600 }}>
              💰 <strong>{fmt(data.availableBalance)}</strong> is ready to withdraw to your M-Pesa.
            </span>
            <Link href="/vendor/payouts" className="ve-link" style={{ fontSize: 13.5 }}>
              Request Payout <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {/* Top stats */}
        <div className="ve-stats">
          <div className="ve-stat green">
            <div className="ve-stat-label">Total Earnings</div>
            <div className="ve-stat-value green">{fmtSmall(data.totalEarnings)}</div>
            <div className="ve-stat-hint">After fees & commissions</div>
          </div>
          <div className="ve-stat">
            <div className="ve-stat-label">Gross Revenue</div>
            <div className="ve-stat-value">{fmtSmall(data.totalRevenue)}</div>
            <div className="ve-stat-hint">Total customer payments</div>
          </div>
          <div className="ve-stat">
            <div className="ve-stat-label">Paid Orders</div>
            <div className="ve-stat-value">{data.paidOrders}</div>
            <div className="ve-stat-hint">of {data.totalOrders} total orders</div>
          </div>
          <div className="ve-stat">
            <div className="ve-stat-label">Platform Fees</div>
            <div className="ve-stat-value">{fmtSmall(data.totalFees)}</div>
            <div className="ve-stat-hint">5% per transaction</div>
          </div>
        </div>

        {/* Balance row */}
        <div className="ve-balrow">
          <div className="ve-bal" style={{ background: data.availableBalance > 0 ? '#f0fdf4' : '#fff', borderColor: data.availableBalance > 0 ? '#86efac' : '#e5e7eb' }}>
            <div className="ve-bal-lbl">Available to Withdraw</div>
            <div className="ve-bal-val" style={{ color: data.availableBalance > 0 ? '#16a34a' : '#111' }}>{fmt(data.availableBalance)}</div>
            {data.availableBalance > 0
              ? <Link href="/vendor/payouts" className="ve-link" style={{ marginTop: 6, display: 'inline-flex', fontSize: 12 }}>Withdraw via M-Pesa →</Link>
              : <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>No funds ready yet</div>}
          </div>
          <div className="ve-bal" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
            <div className="ve-bal-lbl">Pending Release</div>
            <div className="ve-bal-val">{fmt(data.pendingBalance)}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Released after delivery</div>
          </div>
          <div className="ve-bal">
            <div className="ve-bal-lbl">Total Paid Out</div>
            <div className="ve-bal-val">{fmt(data.paidOutTotal)}</div>
            <Link href="/vendor/payouts" className="ve-link" style={{ marginTop: 6, display: 'inline-flex', fontSize: 12 }}>View history →</Link>
          </div>
        </div>

        {/* Chart + Breakdown */}
        <div className="ve-grid2">
          {/* Monthly chart */}
          <div className="ve-card">
            <div className="ve-card-head">
              <span className="ve-card-title">Monthly Earnings</span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Last 6 months</span>
            </div>
            <div className="ve-card-body">
              <MiniBarChart data={data.monthlySales} />
            </div>
          </div>

          {/* Revenue breakdown donut */}
          <div className="ve-card">
            <div className="ve-card-head">
              <span className="ve-card-title">Revenue Breakdown</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af' }}>
                <Info size={11} /> All time
              </div>
            </div>
            <div className="ve-card-body">
              <EarningsDonut
                earnings={data.totalEarnings}
                fees={data.totalFees}
                commissions={data.totalCommissions}
              />
            </div>
          </div>
        </div>

        {/* Top products + Recent orders */}
        <div className="ve-grid2b">
          {/* Top products */}
          <div className="ve-card">
            <div className="ve-card-head">
              <span className="ve-card-title">Top Products</span>
              <Link href="/vendor/products" className="ve-link">View all <ChevronRight size={12} /></Link>
            </div>
            <div className="ve-card-body" style={{ padding: '8px 20px' }}>
              {data.topProducts.length === 0 ? (
                <div className="ve-empty">No sales yet</div>
              ) : (
                data.topProducts.map((p, i) => (
                  <div key={p.id} className="ve-prod-row">
                    <div style={{ width: 20, fontSize: 12, fontWeight: 800, color: i === 0 ? '#16a34a' : '#9ca3af' }}>
                      #{i + 1}
                    </div>
                    <div className="ve-prod-img">
                      {p.image
                        ? <img src={p.image} alt={p.title} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛍️</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {p.unitsSold} units · {p.orderCount} orders
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', flexShrink: 0 }}>
                      {fmtSmall(p.totalEarnings)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* This month summary */}
          <div className="ve-card">
            <div className="ve-card-head">
              <span className="ve-card-title">This Month</span>
            </div>
            <div className="ve-card-body">
              {(() => {
                const thisMonth = data.monthlySales[data.monthlySales.length - 1];
                const lastMonth = data.monthlySales[data.monthlySales.length - 2];
                if (!thisMonth) return <div className="ve-empty">No data yet</div>;
                const change = lastMonth
                  ? ((thisMonth.earnings - lastMonth.earnings) / (lastMonth.earnings || 1)) * 100
                  : 0;
                const isUp = change >= 0;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 4 }}>Earnings</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.04em' }}>{fmt(thisMonth.earnings)}</div>
                      {lastMonth && (
                        <div style={{ fontSize: 12, color: isUp ? '#16a34a' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <TrendingUp size={12} />
                          {isUp ? '+' : ''}{change.toFixed(1)}% vs last month
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Orders',  value: thisMonth.orders },
                        { label: 'Revenue', value: fmt(thisMonth.revenue) },
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
                          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginTop: 2 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="ve-card">
          <div className="ve-card-head">
            <span className="ve-card-title">Order Earnings</span>
            <Link href="/vendor/orders" className="ve-link">Manage orders <ChevronRight size={12} /></Link>
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 20px' }}>
            <div className="ve-tabs">
              {[
                { key: 'all',     label: 'All Orders' },
                { key: 'paid',    label: 'Paid' },
                { key: 'pending', label: 'Pending' },
              ].map(t => (
                <button
                  key={t.key}
                  className={`ve-tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key as any)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="ve-table" style={{ padding: '0 20px' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Product</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Sale Price</th>
                  <th>Platform Fee</th>
                  <th>Affiliate</th>
                  <th>Your Earnings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(o => {
                    const st = ORDER_STATUS_STYLE[o.orderStatus] ?? ORDER_STATUS_STYLE.CREATED;
                    return (
                      <tr key={o.id}>
                        <td style={{ paddingLeft: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                              {o.productImage
                                ? <img src={o.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</div>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.productTitle}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#6b7280' }}>{o.customerName}</td>
                        <td style={{ color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {new Date(o.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 700 }}>{fmt(o.totalAmount)}</td>
                        <td style={{ color: '#9ca3af' }}>-{fmt(o.platformFee)}</td>
                        <td style={{ color: o.affiliateCommission > 0 ? '#d97706' : '#d1d5db' }}>
                          {o.affiliateCommission > 0 ? `-${fmt(o.affiliateCommission)}` : '—'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: o.paymentStatus === 'PAID' ? '#16a34a' : '#374151' }}>
                            {fmt(o.vendorEarnings)}
                          </span>
                        </td>
                        <td>
                          <span className="ve-pill" style={{ background: st.bg, color: st.color }}>
                            {o.orderStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
