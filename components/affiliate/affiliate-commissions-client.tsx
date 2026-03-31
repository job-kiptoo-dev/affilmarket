'use client';

import { useState }  from 'react';
import Link          from 'next/link';
import {
  TrendingUp, MousePointer, ShoppingCart,
  Percent, ChevronRight, Copy, Check,
  ArrowUpRight, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id:                  string;
  createdAt:           string;
  totalAmount:         number;
  affiliateCommission: number;
  commissionRate:      number;
  orderStatus:         string;
  paymentStatus:       string;
  customerName:        string;
  quantity:            number;
  productTitle:        string;
  productImage:        string | null;
}

interface TopProduct {
  id:              string;
  title:           string;
  image:           string | null;
  price:           number;
  commissionRate:  number;
  conversions:     number;
  totalCommission: number;
  totalClicks:     number;
  conversionRate:  number;
}

interface MonthlySale {
  month:      string;
  commission: number;
  orders:     number;
}

interface ClickDay {
  day:    string;
  clicks: number;
}

export interface AffiliateCommissionsData {
  fullName:         string;
  affiliateToken:   string;
  availableBalance: number;
  pendingBalance:   number;
  paidOutTotal:     number;
  totalCommission:  number;
  totalConversions: number;
  totalClicks:      number;
  conversionRate:   number;
  orders:           Order[];
  topProducts:      TopProduct[];
  monthlySales:     MonthlySale[];
  clicksByDay:      ClickDay[];
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

const ORDER_STYLE: Record<string, { bg: string; color: string }> = {
  CREATED:   { bg: '#fffbeb', color: '#d97706' },
  PAID:      { bg: '#eff6ff', color: '#2563eb' },
  CONFIRMED: { bg: '#f5f3ff', color: '#7c3aed' },
  SHIPPED:   { bg: '#fff7ed', color: '#ea580c' },
  DELIVERED: { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
};

// ─── Bar chart (commissions) ──────────────────────────────────────────────────
function CommissionBarChart({ data }: { data: MonthlySale[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.commission), 1);

  if (!data.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9ca3af', fontSize: 13 }}>
        No commission data yet
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {hovered !== null && data[hovered] && (
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#fff', borderRadius: 8, padding: '7px 12px',
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 10,
          pointerEvents: 'none',
        }}>
          {data[hovered].month}: {fmt(data[hovered].commission)} · {data[hovered].orders} orders
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 24 }}>
        {data.map((d, i) => {
          const pct = (d.commission / max) * 100;
          const isHov = hovered === i;
          return (
            <div key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0',
                height: `${Math.max(pct, 4)}%`,
                background: isHov
                  ? 'linear-gradient(180deg, #d97706, #b45309)'
                  : 'linear-gradient(180deg, #fcd34d, #fbbf24)',
                transition: 'background 0.15s, transform 0.15s',
                transform: isHov ? 'scaleY(1.03)' : 'scaleY(1)',
                transformOrigin: 'bottom',
              }} />
              <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Clicks sparkline ─────────────────────────────────────────────────────────
function ClicksSparkline({ data }: { data: ClickDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, color: '#9ca3af', fontSize: 12 }}>
        No click data yet
      </div>
    );
  }

  const max    = Math.max(...data.map(d => d.clicks), 1);
  const W      = 100;
  const H      = 60;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1 || 1)) * W,
    y: H - (d.clicks / max) * (H - 8),
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${H} L 0 ${H} Z`;

  return (
    <div style={{ position: 'relative' }}>
      {hovered !== null && points[hovered] && (
        <div style={{
          position: 'absolute',
          left: `${(hovered / (data.length - 1 || 1)) * 100}%`,
          top: -28, transform: 'translateX(-50%)',
          background: '#111', color: '#fff', borderRadius: 6,
          padding: '4px 8px', fontSize: 11, fontWeight: 600,
          whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
        }}>
          {points[hovered].clicks} clicks
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, overflow: 'visible' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fbbf24" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#clickGrad)" />
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y} r={hovered === i ? 3 : 0}
            fill="#f59e0b"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* invisible hover zones */}
        {points.map((p, i) => (
          <rect
            key={`h${i}`}
            x={p.x - (W / data.length / 2)} y={0}
            width={W / data.length} height={H}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, hint, icon, accent = '#111', bg = '#fff',
}: {
  label: string; value: string; hint?: string;
  icon: React.ReactNode; accent?: string; bg?: string;
}) {
  return (
    <div style={{
      background: bg, border: '1px solid #e5e7eb', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, letterSpacing: '-0.04em' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: copied ? '#f0fdf4' : '#f3f4f6',
      border: `1px solid ${copied ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 7, padding: '5px 10px', fontSize: 12,
      fontWeight: 600, color: copied ? '#16a34a' : '#374151',
      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
    }}>
      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AffiliateCommissionsClient({ data }: { data: AffiliateCommissionsData }) {
  const [tab, setTab] = useState<'all' | 'paid' | 'pending'>('all');

  const filteredOrders = data.orders.filter(o => {
    if (tab === 'paid')    return o.paymentStatus === 'PAID';
    if (tab === 'pending') return o.paymentStatus === 'PENDING';
    return true;
  });

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const refLink = `${appUrl}/products?ref=${data.affiliateToken}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .ac { font-family: 'DM Sans', -apple-system, sans-serif; }
        .ac-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .ac-sub   { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }

        .ac-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }

        .ac-grid2  { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-bottom: 20px; }
        .ac-grid2b { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
        .ac-grid3  { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 20px; }

        .ac-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .ac-card-head { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .ac-card-title { font-size: 14px; font-weight: 700; color: #111; }
        .ac-card-body  { padding: 20px; }

        .ac-link { font-size: 12.5px; color: #d97706; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .ac-link:hover { text-decoration: underline; }

        /* Ref link box */
        .ac-refbox { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .ac-refurl { font-size: 12.5px; color: #92400e; font-family: monospace; word-break: break-all; flex: 1; }

        /* Balance cards */
        .ac-bal { border-radius: 12px; padding: 16px 18px; border: 1px solid #e5e7eb; background: #fff; }
        .ac-bal-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
        .ac-bal-val { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.04em; }

        /* Conversion meter */
        .ac-meter { height: 8px; background: #f3f4f6; border-radius: 100px; overflow: hidden; margin: 8px 0; }
        .ac-meter-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #fbbf24, #f59e0b); transition: width 0.6s; }

        /* Tabs */
        .ac-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; }
        .ac-tab  { padding: 10px 16px; font-size: 13px; font-weight: 600; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .ac-tab.active { color: #111; border-bottom-color: #d97706; }

        /* Table */
        .ac-table { width: 100%; border-collapse: collapse; }
        .ac-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 12px; border-bottom: 1px solid #f3f4f6; }
        .ac-table th:first-child { padding-left: 20px; }
        .ac-table td { padding: 13px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .ac-table td:first-child { padding-left: 20px; }
        .ac-table tr:last-child td { border-bottom: none; }
        .ac-pill { display: inline-flex; align-items: center; border-radius: 100px; padding: 2px 9px; font-size: 11px; font-weight: 700; }

        /* Product rows */
        .ac-prod-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid #f9fafb; }
        .ac-prod-row:last-child { border-bottom: none; }

        @media (max-width: 1100px) { .ac-stats { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 900px)  { .ac-grid2, .ac-grid2b { grid-template-columns: 1fr; } }
        @media (max-width: 640px)  { .ac-stats, .ac-grid3 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="ac">
        <h1 className="ac-title">Commissions</h1>
        <p className="ac-sub">Track your clicks, conversions and earnings from referred sales.</p>

        {/* Referral link */}
        <div className="ac-refbox">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b45309', marginBottom: 4 }}>
              🔗 Your Referral Link
            </div>
            <div className="ac-refurl">{refLink}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <CopyButton text={refLink} />
            <Link href="/affiliate/products" className="ac-link" style={{ fontSize: 12 }}>
              Browse products <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="ac-stats">
          <StatCard
            label="Total Commissions"
            value={fmtSmall(data.totalCommission)}
            hint="From paid orders"
            icon={<TrendingUp size={15} />}
            accent="#d97706"
            bg="#fffbeb"
          />
          <StatCard
            label="Total Clicks"
            value={data.totalClicks.toLocaleString()}
            hint="All time link clicks"
            icon={<MousePointer size={15} />}
          />
          <StatCard
            label="Conversions"
            value={data.totalConversions.toLocaleString()}
            hint="Clicks that became orders"
            icon={<ShoppingCart size={15} />}
          />
          <StatCard
            label="Conversion Rate"
            value={`${data.conversionRate.toFixed(1)}%`}
            hint={data.totalClicks > 0 ? `${data.totalConversions} of ${data.totalClicks} clicks` : 'No clicks yet'}
            icon={<Percent size={15} />}
            accent={data.conversionRate >= 3 ? '#16a34a' : '#374151'}
          />
        </div>

        {/* Balance row */}
        <div className="ac-grid3" style={{ marginBottom: 20 }}>
          <div className="ac-bal" style={{ background: data.availableBalance > 0 ? '#fffbeb' : '#fff', borderColor: data.availableBalance > 0 ? '#fde68a' : '#e5e7eb' }}>
            <div className="ac-bal-lbl">Available to Withdraw</div>
            <div className="ac-bal-val" style={{ color: data.availableBalance > 0 ? '#d97706' : '#111' }}>{fmt(data.availableBalance)}</div>
            {data.availableBalance >= 100
              ? <Link href="/affiliate/payouts" className="ac-link" style={{ marginTop: 6, display: 'inline-flex', fontSize: 12 }}>Withdraw now →</Link>
              : <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Min KES 100 to withdraw</div>}
          </div>
          <div className="ac-bal" style={{ background: '#f9fafb' }}>
            <div className="ac-bal-lbl">Pending Release</div>
            <div className="ac-bal-val">{fmt(data.pendingBalance)}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Released after delivery</div>
          </div>
          <div className="ac-bal">
            <div className="ac-bal-lbl">Total Paid Out</div>
            <div className="ac-bal-val">{fmt(data.paidOutTotal)}</div>
            <Link href="/affiliate/payouts" className="ac-link" style={{ marginTop: 6, display: 'inline-flex', fontSize: 12 }}>View history →</Link>
          </div>
        </div>

        {/* Chart + Conversion funnel */}
        <div className="ac-grid2">
          {/* Monthly commission chart */}
          <div className="ac-card">
            <div className="ac-card-head">
              <span className="ac-card-title">Monthly Commissions</span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Last 6 months</span>
            </div>
            <div className="ac-card-body">
              <CommissionBarChart data={data.monthlySales} />
            </div>
          </div>

          {/* Conversion stats */}
          <div className="ac-card">
            <div className="ac-card-head">
              <span className="ac-card-title">Conversion Funnel</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af' }}>
                <Info size={11} /> All time
              </div>
            </div>
            <div className="ac-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { label: 'Link Clicks',   value: data.totalClicks,      pct: 100,                                         color: '#e5e7eb' },
                  { label: 'Orders Placed', value: data.totalConversions,  pct: data.conversionRate,                         color: '#fbbf24' },
                  { label: 'Paid Orders',   value: data.orders.filter(o => o.paymentStatus === 'PAID').length,
                    pct: data.totalClicks > 0
                      ? (data.orders.filter(o => o.paymentStatus === 'PAID').length / data.totalClicks) * 100 : 0,
                    color: '#f59e0b' },
                ].map((step, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{step.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{step.value.toLocaleString()}</span>
                    </div>
                    <div className="ac-meter">
                      <div className="ac-meter-fill" style={{ width: `${Math.min(step.pct, 100)}%`, background: step.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {step.pct.toFixed(1)}% of clicks
                    </div>
                  </div>
                ))}

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>💡 Industry average</div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    Affiliate conversion rates typically range from <strong>1–5%</strong>.
                    {data.conversionRate >= 3
                      ? ' You\'re performing above average! 🎉'
                      : ' Keep sharing your links to improve.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clicks sparkline + Top products */}
        <div className="ac-grid2b">
          {/* Clicks last 30 days */}
          <div className="ac-card">
            <div className="ac-card-head">
              <span className="ac-card-title">Clicks — Last 30 Days</span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                {data.clicksByDay.reduce((s, d) => s + d.clicks, 0).toLocaleString()} total
              </span>
            </div>
            <div className="ac-card-body">
              <ClicksSparkline data={data.clicksByDay} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>
                    {data.clicksByDay.length > 0
                      ? Math.round(data.clicksByDay.reduce((s, d) => s + d.clicks, 0) / data.clicksByDay.length)
                      : 0}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Avg/day</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>
                    {data.clicksByDay.length > 0
                      ? Math.max(...data.clicksByDay.map(d => d.clicks))
                      : 0}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Best day</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>
                    {data.clicksByDay.filter(d => d.clicks > 0).length}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Active days</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="ac-card">
            <div className="ac-card-head">
              <span className="ac-card-title">Top Products</span>
              <Link href="/affiliate/products" className="ac-link">Browse all <ChevronRight size={12} /></Link>
            </div>
            <div className="ac-card-body" style={{ padding: '8px 20px' }}>
              {data.topProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af', fontSize: 13 }}>
                  Start sharing products to see stats here
                </div>
              ) : (
                data.topProducts.map((p, i) => (
                  <div key={p.id} className="ac-prod-row">
                    <div style={{ width: 20, fontSize: 12, fontWeight: 800, color: i === 0 ? '#d97706' : '#9ca3af' }}>
                      #{i + 1}
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                      {p.image
                        ? <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛍️</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                        {p.totalClicks} clicks · {p.conversions} sales · {p.conversionRate.toFixed(1)}% CVR
                      </div>
                      {/* Mini conversion bar */}
                      <div style={{ height: 3, background: '#f3f4f6', borderRadius: 100, marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(p.conversionRate * 10, 100)}%`, background: '#fbbf24', borderRadius: 100 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#d97706', flexShrink: 0, textAlign: 'right' }}>
                      <div>{fmtSmall(p.totalCommission)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
                        {(p.commissionRate * 100).toFixed(0)}% rate
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="ac-card">
          <div className="ac-card-head">
            <span className="ac-card-title">Commission History</span>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div className="ac-tabs">
              {[
                { key: 'all',     label: 'All Orders' },
                { key: 'paid',    label: 'Paid' },
                { key: 'pending', label: 'Pending' },
              ].map(t => (
                <button
                  key={t.key}
                  className={`ac-tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key as any)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Sale Price</th>
                  <th>Rate</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(o => {
                    const st = ORDER_STYLE[o.orderStatus] ?? ORDER_STYLE.CREATED;
                    return (
                      <tr key={o.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                              {o.productImage
                                ? <img src={o.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</div>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.productTitle}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#6b7280' }}>{o.customerName}</td>
                        <td style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 700 }}>{fmt(o.totalAmount)}</td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 700, background: '#fffbeb', color: '#d97706', borderRadius: 100, padding: '2px 8px' }}>
                            {(o.commissionRate * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: o.paymentStatus === 'PAID' ? '#d97706' : '#9ca3af' }}>
                            {fmt(o.affiliateCommission)}
                          </span>
                          {o.paymentStatus === 'PENDING' && (
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>pending</div>
                          )}
                        </td>
                        <td>
                          <span className="ac-pill" style={{ background: st.bg, color: st.color }}>
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
