'use client';

import { useState } from 'react';
import Link         from 'next/link';
import {
  TrendingUp, TrendingDown, MousePointer,
  ShoppingCart, ChevronRight, Clock, Globe,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayData     { day: string; clicks: number; orders: number; commission: number }
interface HourData    { hour: number; clicks: number }
interface DowData     { dow: string; clicks: number }
interface MonthData   { label: string; clicks: number; orders: number; commission: number }
interface ProductData {
  id: string; title: string; image: string | null;
  price: number; commissionRate: number;
  clicks: number; orders: number; commission: number; cvr: number;
}
interface CityData    { city: string; clicks: number }
interface ReferrerData{ source: string; clicks: number }
interface RecentClick {
  createdAt: string; referrer: string | null;
  ipAddress: string | null; productTitle: string; productImage: string | null;
}

export interface AffiliateAnalyticsData {
  fullName:     string;
  clicks30d:    number;
  clicksPrev:   number;
  clickChange:  number;
  clicksAll:    number;
  days30:       DayData[];
  hourData:     HourData[];
  dowData:      DowData[];
  monthly:      MonthData[];
  products:     ProductData[];
  cityData:     CityData[];
  referrerData: ReferrerData[];
  recentClicks: RecentClick[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const SOURCE_COLORS: Record<string, string> = {
  Facebook:   '#1877f2', 'Instagram': '#e1306c', 'Twitter/X': '#000',
  TikTok:     '#010101', WhatsApp:   '#25d366',  Google:     '#4285f4',
  Direct:     '#6b7280', Other:      '#9ca3af',
};
const SOURCE_EMOJI: Record<string, string> = {
  Facebook: '📘', Instagram: '📸', 'Twitter/X': '🐦',
  TikTok: '🎵', WhatsApp: '💬', Google: '🔍',
  Direct: '🔗', Other: '🌐',
};

// ─── Dual-axis line chart (clicks + commissions) ──────────────────────────────
function DualLineChart({ data }: { data: DayData[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [view, setView]       = useState<'clicks' | 'commission' | 'both'>('both');

  const maxClicks = Math.max(...data.map(d => d.clicks), 1);
  const maxComm   = Math.max(...data.map(d => d.commission), 1);
  const W = 100; const H = 80;

  const clickPts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.clicks / maxClicks) * (H - 8),
  }));
  const commPts  = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (d.commission / maxComm) * (H - 8),
  }));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const toArea = (pts: { x: number; y: number }[]) =>
    `${toPath(pts)} L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`;

  const hov = hovered !== null ? data[hovered] : null;

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['both', 'clicks', 'commission'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            border: `1px solid ${view === v ? '#374151' : '#e5e7eb'}`,
            background: view === v ? '#111' : '#fff',
            color: view === v ? '#fff' : '#6b7280',
            cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
          }}>
            {v === 'both' ? 'All' : v}
          </button>
        ))}
      </div>

      {/* Tooltip */}
      {hov && (
        <div style={{
          background: '#111', color: '#fff', borderRadius: 8, padding: '8px 12px',
          fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'inline-flex', gap: 16,
        }}>
          <span>📅 {new Date(hov.day).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
          <span>👆 {hov.clicks} clicks</span>
          {hov.orders > 0 && <span>🛍 {hov.orders} orders</span>}
          {hov.commission > 0 && <span>💰 {fmt(hov.commission)}</span>}
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 140, overflow: 'visible' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>

        {(view === 'clicks' || view === 'both') && (
          <>
            <path d={toArea(clickPts)} fill="url(#ag1)" />
            <path d={toPath(clickPts)} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {(view === 'commission' || view === 'both') && (
          <>
            <path d={toArea(commPts)} fill="url(#ag2)" />
            <path d={toPath(commPts)} fill="none" stroke="#16a34a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={view === 'both' ? '2 1' : undefined} />
          </>
        )}

        {/* Hover dot */}
        {hovered !== null && (view === 'clicks' || view === 'both') && (
          <circle cx={clickPts[hovered].x} cy={clickPts[hovered].y} r={2.5} fill="#f59e0b" />
        )}
        {hovered !== null && (view === 'commission' || view === 'both') && (
          <circle cx={commPts[hovered].x} cy={commPts[hovered].y} r={2.5} fill="#16a34a" />
        )}

        {/* Invisible hover zones */}
        {data.map((_, i) => (
          <rect key={i}
            x={(i / (data.length - 1)) * W - W / data.length / 2}
            y={0} width={W / data.length} height={H}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* X-axis labels — show every 7 days */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
            {new Date(d.day).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
          <div style={{ width: 16, height: 2, background: '#f59e0b', borderRadius: 1 }} /> Clicks
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
          <div style={{ width: 16, height: 2, background: '#16a34a', borderRadius: 1, opacity: 0.8 }} /> Commission
        </div>
      </div>
    </div>
  );
}

// ─── Hour heatmap ─────────────────────────────────────────────────────────────
function HourHeatmap({ data }: { data: HourData[] }) {
  const max = Math.max(...data.map(d => d.clicks), 1);
  const [hov, setHov] = useState<number | null>(null);
  const bestHour = data.reduce((best, d) => d.clicks > best.clicks ? d : best, data[0]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {data.map((d, i) => {
          const intensity = d.clicks / max;
          return (
            <div key={i}
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: d.clicks === 0
                  ? '#f3f4f6'
                  : `rgba(251,191,36,${0.15 + intensity * 0.85})`,
                border: hov === i ? '1.5px solid #f59e0b' : '1px solid transparent',
                cursor: 'pointer', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                color: intensity > 0.5 ? '#92400e' : '#9ca3af',
                transition: 'transform 0.1s',
                transform: hov === i ? 'scale(1.15)' : 'scale(1)',
              }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              title={`${d.hour}:00 — ${d.clicks} clicks`}
            >
              {d.hour}
            </div>
          );
        })}
      </div>
      {hov !== null ? (
        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
          🕐 {hov}:00–{hov + 1}:00 → <strong style={{ color: '#111' }}>{data[hov]?.clicks} clicks</strong>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
          🔥 Best hour: <strong style={{ color: '#d97706' }}>{bestHour?.hour}:00</strong> ({bestHour?.clicks} clicks)
        </div>
      )}
    </div>
  );
}

// ─── Day of week bars ─────────────────────────────────────────────────────────
function DowBars({ data }: { data: DowData[] }) {
  const max    = Math.max(...data.map(d => d.clicks), 1);
  const [hov, setHov] = useState<number | null>(null);
  const bestDay = data.reduce((b, d) => d.clicks > b.clicks ? d : b, data[0]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
        {data.map((d, i) => {
          const pct   = (d.clicks / max) * 100;
          const isHov = hov === i;
          const isBest = d.dow === bestDay.dow;
          return (
            <div key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                height: `${Math.max(pct, 6)}%`,
                background: isHov || isBest
                  ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                  : 'linear-gradient(180deg, #fde68a, #fcd34d)',
                transition: 'all 0.15s',
                transform: isHov ? 'scaleY(1.05)' : 'scaleY(1)',
                transformOrigin: 'bottom',
              }} />
              <span style={{ fontSize: 10, color: isHov || isBest ? '#d97706' : '#9ca3af', fontWeight: 700 }}>
                {d.dow}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 8 }}>
        🔥 Best day: <strong style={{ color: '#d97706' }}>{bestDay?.dow}</strong> ({bestDay?.clicks} clicks)
        {hov !== null && <span> · {data[hov].dow}: {data[hov].clicks} clicks</span>}
      </div>
    </div>
  );
}

// ─── Referrer donut ───────────────────────────────────────────────────────────
function ReferrerChart({ data }: { data: ReferrerData[] }) {
  const [hov, setHov] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.clicks, 0) || 1;

  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>No referrer data yet</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => {
        const pct     = (d.clicks / total) * 100;
        const color   = SOURCE_COLORS[d.source] ?? '#9ca3af';
        const emoji   = SOURCE_EMOJI[d.source]  ?? '🌐';
        const isHov   = hov === d.source;
        return (
          <div key={i}
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHov(d.source)}
            onMouseLeave={() => setHov(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isHov ? '#111' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                {emoji} {d.source}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>
                {d.clicks} · {pct.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 100,
                width: `${pct}%`,
                background: color,
                transition: 'width 0.5s, opacity 0.15s',
                opacity: isHov ? 1 : 0.75,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monthly trend bars ───────────────────────────────────────────────────────
function MonthlyTrendChart({ data }: { data: MonthData[] }) {
  const [metric, setMetric] = useState<'clicks' | 'orders' | 'commission'>('clicks');
  const [hov, setHov]       = useState<number | null>(null);
  const vals  = data.map(d => d[metric]);
  const max   = Math.max(...vals, 1);
  const colors = { clicks: '#fbbf24', orders: '#60a5fa', commission: '#34d399' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['clicks', 'orders', 'commission'] as const).map(m => (
          <button key={m} onClick={() => setMetric(m)} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
            border: `1px solid ${metric === m ? colors[m] : '#e5e7eb'}`,
            background: metric === m ? colors[m] : '#fff',
            color: metric === m ? '#fff' : '#6b7280',
            cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
          }}>
            {m}
          </button>
        ))}
      </div>

      {!data.length ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>No data yet</div>
      ) : (
        <>
          {hov !== null && data[hov] && (
            <div style={{ background: '#111', color: '#fff', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'inline-block' }}>
              {data[hov].label}: {metric === 'commission' ? fmt(data[hov][metric]) : data[hov][metric]}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
            {data.map((d, i) => {
              const pct   = (d[metric] / max) * 100;
              const isHov = hov === i;
              return (
                <div key={i}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  onMouseEnter={() => setHov(i)}
                  onMouseLeave={() => setHov(null)}
                >
                  <div style={{
                    width: '100%', borderRadius: '5px 5px 0 0',
                    height: `${Math.max(pct, 4)}%`,
                    background: colors[metric],
                    opacity: isHov ? 1 : 0.65,
                    transition: 'opacity 0.15s, transform 0.15s',
                    transform: isHov ? 'scaleY(1.04)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                  }} />
                  <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600 }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, trend, bg = '#fff' }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; trend?: number; bg?: string;
}) {
  const isUp = (trend ?? 0) >= 0;
  return (
    <div style={{ background: bg, border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>{label}</span>
        <div style={{ color: '#9ca3af' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.04em' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: isUp ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 2 }}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {isUp ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AffiliateAnalyticsClient({ data }: { data: AffiliateAnalyticsData }) {
  const totalOrders30d   = data.days30.reduce((s, d) => s + d.orders, 0);
  const totalComm30d     = data.days30.reduce((s, d) => s + d.commission, 0);
  const cvr30d           = data.clicks30d > 0 ? (totalOrders30d / data.clicks30d) * 100 : 0;
  const avgCommPerOrder  = totalOrders30d > 0 ? totalComm30d / totalOrders30d : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .aa { font-family: 'DM Sans', -apple-system, sans-serif; }
        .aa-title { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.04em; }
        .aa-sub   { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }
        .aa-badge { display: inline-flex; align-items: center; gap: 5px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 20px; }

        .aa-stats  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        .aa-grid2  { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; margin-bottom: 20px; }
        .aa-grid2b { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
        .aa-grid3  { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 20px; }

        .aa-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .aa-card-head { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; }
        .aa-card-title { font-size: 14px; font-weight: 700; color: #111; }
        .aa-card-body  { padding: 20px; }
        .aa-link { font-size: 12.5px; color: #d97706; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
        .aa-link:hover { text-decoration: underline; }

        /* Product table */
        .aa-table { width: 100%; border-collapse: collapse; }
        .aa-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
        .aa-table td { padding: 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
        .aa-table tr:last-child td { border-bottom: none; }

        /* Recent clicks */
        .aa-click-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f9fafb; }
        .aa-click-row:last-child { border-bottom: none; }

        @media (max-width: 1100px) { .aa-stats { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 900px)  { .aa-grid2, .aa-grid2b { grid-template-columns: 1fr; } }
        @media (max-width: 640px)  { .aa-stats, .aa-grid3 { grid-template-columns: 1fr; } }
      `}</style>

      <div className="aa">
        <h1 className="aa-title">Analytics</h1>
        <p className="aa-sub">Deep dive into your traffic, conversions and earnings performance.</p>

        <div className="aa-badge">
          📅 Last 30 days · {new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} – {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {/* Stats */}
        <div className="aa-stats">
          <StatCard
            label="Clicks (30d)"
            value={data.clicks30d.toLocaleString()}
            sub="vs prev 30 days"
            icon={<MousePointer size={15} />}
            trend={data.clickChange}
            bg={data.clicks30d > 0 ? '#fffbeb' : '#fff'}
          />
          <StatCard
            label="Conversions (30d)"
            value={totalOrders30d.toLocaleString()}
            sub="paid orders"
            icon={<ShoppingCart size={15} />}
          />
          <StatCard
            label="Conv. Rate (30d)"
            value={`${cvr30d.toFixed(2)}%`}
            sub={`${data.clicksAll.toLocaleString()} total clicks ever`}
            icon={<TrendingUp size={15} />}
            bg={cvr30d >= 3 ? '#f0fdf4' : '#fff'}
          />
          <StatCard
            label="Avg Commission"
            value={fmt(avgCommPerOrder)}
            sub="per converted order"
            icon={<Clock size={15} />}
          />
        </div>

        {/* Main chart */}
        <div className="aa-grid2">
          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Traffic & Earnings — Last 30 Days</span>
            </div>
            <div className="aa-card-body">
              <DualLineChart data={data.days30} />
            </div>
          </div>

          {/* Monthly trend */}
          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">6-Month Trend</span>
            </div>
            <div className="aa-card-body">
              <MonthlyTrendChart data={data.monthly} />
            </div>
          </div>
        </div>

        {/* Hour heatmap + DOW + Referrers */}
        <div className="aa-grid3">
          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Best Hours</span>
              <Clock size={13} style={{ color: '#9ca3af' }} />
            </div>
            <div className="aa-card-body">
              <HourHeatmap data={data.hourData} />
            </div>
          </div>

          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Best Days</span>
            </div>
            <div className="aa-card-body">
              <DowBars data={data.dowData} />
            </div>
          </div>

          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Traffic Sources</span>
              <Globe size={13} style={{ color: '#9ca3af' }} />
            </div>
            <div className="aa-card-body">
              <ReferrerChart data={data.referrerData} />
            </div>
          </div>
        </div>

        {/* Product performance table */}
        <div className="aa-card" style={{ marginBottom: 20 }}>
          <div className="aa-card-head">
            <span className="aa-card-title">Product Performance</span>
            <Link href="/affiliate/products" className="aa-link">Browse products <ChevronRight size={12} /></Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Commission Rate</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>CVR</th>
                  <th>Earned</th>
                  <th>CVR Bar</th>
                </tr>
              </thead>
              <tbody>
                {data.products.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No product data yet — start sharing links!</td></tr>
                ) : data.products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                          {p.image
                            ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</div>}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(p.price)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ background: '#fffbeb', color: '#d97706', borderRadius: 100, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {(p.commissionRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.clicks.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>{p.orders}</td>
                    <td style={{ fontWeight: 800, color: p.cvr >= 3 ? '#16a34a' : p.cvr >= 1 ? '#d97706' : '#9ca3af' }}>
                      {p.cvr.toFixed(1)}%
                    </td>
                    <td style={{ fontWeight: 800, color: '#d97706' }}>{fmt(p.commission)}</td>
                    <td style={{ minWidth: 80 }}>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(p.cvr * 10, 100)}%`, background: p.cvr >= 3 ? '#16a34a' : '#fbbf24', borderRadius: 100 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* City breakdown + Recent clicks */}
        <div className="aa-grid2b">
          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Geographic Breakdown</span>
              <Globe size={13} style={{ color: '#9ca3af' }} />
            </div>
            <div className="aa-card-body">
              {data.cityData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>No location data yet</div>
              ) : (() => {
                const total = data.cityData.reduce((s, d) => s + d.clicks, 0) || 1;
                return data.cityData.map((c, i) => {
                  const pct = (c.clicks / total) * 100;
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>📍 {c.city}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>{c.clicks} · {pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', borderRadius: 100 }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="aa-card">
            <div className="aa-card-head">
              <span className="aa-card-title">Recent Clicks</span>
              <Link href="/affiliate/commissions" className="aa-link">Full history <ChevronRight size={12} /></Link>
            </div>
            <div className="aa-card-body" style={{ padding: '8px 20px' }}>
              {data.recentClicks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>No clicks yet</div>
              ) : data.recentClicks.map((c, i) => {
                const source = c.referrer
                  ? Object.entries(SOURCE_COLORS).find(([k]) => c.referrer!.toLowerCase().includes(k.toLowerCase()))?.[0] ?? 'Other'
                  : 'Direct';
                return (
                  <div key={i} className="aa-click-row">
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                      {c.productImage
                        ? <img src={c.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.productTitle}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {SOURCE_EMOJI[source] ?? '🌐'} {source} · {new Date(c.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
                      {new Date(c.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
