"use client";

import { useState, useTransition } from "react";
import { getAnalyticsData, AnalyticsData, AnalyticsPeriod } from "@/action/AdminAnalyticalAction";
import { C, FUNNEL_COLORS } from "@/types/admin-analytics-type";
import { fmtK } from "@/lib/healpers/admin-orders-client";
import { delta, fmtHour, pct, shortDate } from "@/lib/healpers/admin-analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────


// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color, width = 80, height = 32 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const area = [`M 0,${height}`, ...data.map((v, i) => `L ${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`), `L ${width},${height} Z`].join(" ");
  const gid = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({ data, lines, height = 220 }: {
  data: Record<string, any>[]; lines: { key: string; color: string; label: string }[]; height?: number;
}) {
  const W = 700, H = height, PAD = { top: 20, right: 20, bottom: 36, left: 62 };
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom;
  const allVals = data.flatMap((d) => lines.map((l) => d[l.key] ?? 0));
  const maxV = Math.max(...allVals, 1);
  const xS = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * iW;
  const yS = (v: number) => PAD.top + iH - (v / maxV) * iH;
  const step = Math.ceil(data.length / 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
      <defs>
        {lines.map((l) => (
          <linearGradient key={l.key} id={`lc${l.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={l.color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={l.color} stopOpacity="0.01" />
          </linearGradient>
        ))}
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yS(maxV * f)} y2={yS(maxV * f)} stroke="#f0f0f0" strokeWidth={1} />
          <text x={PAD.left - 8} y={yS(maxV * f) + 4} textAnchor="end" fill="#b0b7c3" fontSize={9.5}>
            {maxV * f >= 1000 ? `${((maxV * f) / 1000).toFixed(0)}k` : (maxV * f).toFixed(0)}
          </text>
        </g>
      ))}
      {lines.map((line) => {
        const pts = data.map((d, i) => `${xS(i)},${yS(d[line.key] ?? 0)}`).join(" ");
        const area = [`M ${xS(0)},${yS(0)}`, ...data.map((d, i) => `L ${xS(i)},${yS(d[line.key] ?? 0)}`), `L ${xS(data.length - 1)},${yS(0)} Z`].join(" ");
        return (
          <g key={line.key}>
            <path d={area} fill={`url(#lc${line.key})`} />
            <polyline points={pts} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {data.length <= 35 && data.map((d, i) => <circle key={i} cx={xS(i)} cy={yS(d[line.key] ?? 0)} r={2.5} fill={line.color} opacity={0.75} />)}
          </g>
        );
      })}
      {data.map((d, i) => i % step === 0 && (
        <text key={i} x={xS(i)} y={H - 8} textAnchor="middle" fill="#b0b7c3" fontSize={9.5}>{shortDate(d.date)}</text>
      ))}
    </svg>
  );
}

// ─── Hour chart ───────────────────────────────────────────────────────────────

function HourChart({ data }: { data: { hour: number; orders: number; revenue: number }[] }) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);
  const W = 700, H = 110, barW = W / 24;
  const intensity = (o: number) => {
    const f = o / maxOrders;
    return `rgb(${Math.round(245 - f * 121)},${Math.round(243 - f * 185)},${Math.round(255 - f * 18)})`;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {data.map((d) => {
          const x = d.hour * barW, bH = (d.orders / maxOrders) * 70;
          return (
            <g key={d.hour}>
              <rect x={x + 2} y={H - 30 - bH} width={barW - 4} height={bH} rx={3} fill={d.orders === 0 ? "#f3f4f6" : intensity(d.orders)} />
              <rect x={x + 2} y={H - 28} width={barW - 4} height={22} rx={3} fill={d.orders === 0 ? "#f9fafb" : intensity(d.orders)} opacity={0.4} />
              {d.orders > 0 && <text x={x + barW / 2} y={H - 14} textAnchor="middle" fill={C.purple} fontSize={8.5} fontWeight={700}>{d.orders}</text>}
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fill="#b0b7c3" fontSize={8}>{d.hour % 3 === 0 ? fmtHour(d.hour) : ""}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {[...data].sort((a, b) => b.orders - a.orders).slice(0, 3).map((d, i) => (
          <div key={d.hour} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: C.purple }}>#{i + 1}</span>
            <span style={{ color: "#374151" }}>{fmtHour(d.hour)}</span>
            <span style={{ color: "#9ca3af" }}>— {d.orders} orders · {fmtK(d.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day of week ──────────────────────────────────────────────────────────────

function DayOfWeekChart({ data }: { data: { label: string; orders: number; revenue: number }[] }) {
  const maxR = Math.max(...data.map((d) => d.revenue), 1);
  const maxO = Math.max(...data.map((d) => d.orders), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, fontSize: 12, fontWeight: 700, color: "#6b7280", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ background: "#f3f4f6", borderRadius: 4, height: 10, overflow: "hidden" }}>
              <div style={{ width: `${(d.revenue / maxR) * 100}%`, height: "100%", background: C.purple, borderRadius: 4, opacity: 0.85 }} />
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${(d.orders / maxO) * 100}%`, height: "100%", background: C.cyan, borderRadius: 4, opacity: 0.7 }} />
            </div>
          </div>
          <div style={{ width: 72, textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{fmtK(d.revenue)}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{d.orders} orders</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
        {[{ label: "Revenue", color: C.purple }, { label: "Orders", color: C.cyan }].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#9ca3af" }}>
            <div style={{ width: 10, height: 4, borderRadius: 2, background: s.color }} /> {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

function FunnelChart({ data }: { data: { status: string; count: number; value: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d) => {
        const color = FUNNEL_COLORS[d.status] ?? C.purple;
        return (
          <div key={d.status} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 74, fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>
              {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
            </div>
            <div style={{ flex: 1, background: "#f9fafb", borderRadius: 6, height: 28, overflow: "hidden" }}>
              <div style={{ width: `${(d.count / maxCount) * 100}%`, height: "100%", background: color, borderRadius: 6, opacity: 0.85, display: "flex", alignItems: "center", paddingLeft: 10, minWidth: d.count > 0 ? 28 : 0 }}>
                {(d.count / maxCount) > 0.2 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{d.count}</span>}
              </div>
            </div>
            <div style={{ width: 36, fontSize: 12, fontWeight: 700, color: "#111827", textAlign: "right", flexShrink: 0 }}>{d.count}</div>
            <div style={{ width: 88, fontSize: 11, color: "#9ca3af", textAlign: "right", flexShrink: 0 }}>{fmtK(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

function Donut({ slices, size = 120, centerLabel, centerSub }: {
  slices: { label: string; value: number; color: string }[]; size?: number; centerLabel?: string; centerSub?: string;
}) {
  const total = slices.reduce((s, v) => s + v.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, background: "#f3f4f6", borderRadius: "50%" }} />;
  const R = 40, cx = 50, cy = 50, sw = 15;
  let ca = -90;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {slices.map((s, i) => {
          const angle = (s.value / total) * 360;
          const s1 = (ca * Math.PI) / 180, e1 = ((ca + angle) * Math.PI) / 180;
          const path = `M ${cx + R * Math.cos(s1)} ${cy + R * Math.sin(s1)} A ${R} ${R} 0 ${angle > 180 ? 1 : 0} 1 ${cx + R * Math.cos(e1)} ${cy + R * Math.sin(e1)}`;
          ca += angle;
          return <path key={i} d={path} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="butt" />;
        })}
        <circle cx={cx} cy={cy} r={R - sw / 2 - 1} fill="white" />
      </svg>
      {(centerLabel || centerSub) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {centerLabel && <div style={{ fontSize: size * 0.15, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{centerLabel}</div>}
          {centerSub && <div style={{ fontSize: size * 0.09, color: "#9ca3af", marginTop: 2 }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderRow({ rank, primary, secondary, value, subValue, color, badge }: {
  rank: number; primary: string; secondary: string; value: string; subValue?: string; color: string; badge?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid #f9fafb" }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: rank <= 3 ? color : "#f3f4f6", color: rank <= 3 ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primary}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{secondary}</div>
      </div>
      {badge && <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: "2px 7px", borderRadius: 10 }}>{badge}</span>}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{value}</div>
        {subValue && <div style={{ fontSize: 11, color: "#9ca3af" }}>{subValue}</div>}
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children, accentColor, topAction }: {
  title: string; subtitle?: string; children: React.ReactNode; accentColor?: string; topAction?: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", borderTop: accentColor ? `3px solid ${accentColor}` : undefined }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {topAction}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, prev, current, color, icon, spark, invertDelta }: {
  label: string; value: string; prev: number; current: number; color: string; icon: string; spark?: number[]; invertDelta?: boolean;
}) {
  const d = delta(current, prev);
  const isGood = invertDelta ? !d.positive : d.positive;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px", borderTop: `3px solid ${color}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{label}</div>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: isGood ? C.green : C.red, background: isGood ? "#f0fdf4" : "#fef2f2", padding: "2px 7px", borderRadius: 10 }}>
          {d.positive ? "↑" : "↓"} {d.val.toFixed(1)}% vs prev
        </span>
        {spark && spark.length > 1 && <Sparkline data={spark} color={color} width={70} height={28} />}
      </div>
    </div>
  );
}

// ─── Period Selector ─────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: AnalyticsPeriod; onChange: (p: AnalyticsPeriod) => void }) {
  return (
    <div style={{ display: "flex", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 3, gap: 2 }}>
      {(["7d","30d","90d","12m"] as AnalyticsPeriod[]).map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          background: value === o ? C.purple : "transparent", color: value === o ? "#fff" : "#6b7280",
          transition: "all 0.15s", fontFamily: "inherit",
        }}>{o}</button>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}>
          <div style={{ width: 10, height: 3, borderRadius: 2, background: item.color }} /> {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsClient({ initialData }: { initialData: AnalyticsData }) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialData.period);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"revenue" | "breakdown" | "orders">("revenue");

  const changePeriod = (p: AnalyticsPeriod) => {
    setPeriod(p);
    startTransition(async () => { setData(await getAnalyticsData(p)); });
  };

  const revSpark = data.dailyRevenue.map((d) => d.revenue).slice(-20);
  const ordSpark = data.dailyRevenue.map((d) => d.orders).slice(-20);
  const commSpark = data.dailyRevenue.map((d) => d.commissions).slice(-20);
  const feeSpark = data.dailyRevenue.map((d) => d.platformFees).slice(-20);

  const chartData = data.dailyRevenue.map((d) => ({ date: d.date, revenue: d.revenue, commissions: d.commissions, platformFees: d.platformFees, orders: d.orders }));

  const statusSlices = data.orderFunnel.map((f) => ({ label: f.status, value: f.count, color: FUNNEL_COLORS[f.status] ?? C.purple }));

  // ✅ mpesaStatusEnum: SUCCESS (not PAID), FAILED, TIMEOUT, PENDING
  const mpesaSlices = [
    { label: "Success", value: data.mpesa.success, color: C.green },
    { label: "Failed",  value: data.mpesa.failed,  color: C.red },
    { label: "Timeout", value: data.mpesa.timeout, color: "#9ca3af" },
    { label: "Pending", value: data.mpesa.pending, color: C.amber },
  ];

  const custSlices = [
    { label: "First-time", value: data.customerRepeat.firstTime, color: C.purple },
    { label: "Repeat",     value: data.customerRepeat.repeat,    color: C.green },
  ];

  const peakHour = [...data.hourOfDay].sort((a, b) => b.orders - a.orders)[0];
  const peakDay  = [...data.dayOfWeek].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; font-family:'DM Sans',sans-serif; }
        .ctab { border:1px solid #e5e7eb; border-radius:8px; padding:5px 13px; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; background:none; color:#6b7280; font-family:inherit; }
        .ctab.active { background:${C.purple}; color:#fff; border-color:${C.purple}; }
        .ctab:hover:not(.active) { border-color:${C.purple}; color:${C.purple}; }
        ::-webkit-scrollbar { width:4px; height:4px; } ::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:2px; }
      `}</style>

      <div style={{ padding: "26px 22px", maxWidth: 1140, margin: "0 auto", opacity: isPending ? 0.55 : 1, transition: "opacity 0.25s" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 27, fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Analytics</h1>
            <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 3 }}>Platform-wide performance · All amounts in KSh · Times in Nairobi </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPending && <span style={{ fontSize: 11, color: C.purple, background: C.purpleLight, padding: "5px 11px", borderRadius: 8, fontWeight: 600 }}>⟳ Refreshing…</span>}
            <PeriodSelector value={period} onChange={changePeriod} />
          </div>
        </div>

        {/* Global counters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20, background: C.purpleLight, borderRadius: 14, padding: 14, border: `1px solid ${C.purpleBorder}` }}>
          {[
            { label: "Total Users",   value: data.totalUsers.toLocaleString(),      icon: "👥" },
            { label: "Vendors",       value: data.totalVendors.toLocaleString(),     icon: "🏪" },
            { label: "Affiliates",    value: data.totalAffiliates.toLocaleString(),  icon: "🔗" },
            { label: "Products",      value: data.totalProducts.toLocaleString(),    icon: "📦" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.purple }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.purple, opacity: 0.65, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: 12, marginBottom: 22 }}>
          <KpiCard label="Total Revenue"    value={fmtK(data.totalRevenue)}    prev={data.prevRevenue}        current={data.totalRevenue}    color={C.purple} icon="💰" spark={revSpark} />
          <KpiCard label="Platform Fees"    value={fmtK(data.platformFees)}    prev={data.prevPlatformFees}   current={data.platformFees}    color={C.blue}   icon="🏦" spark={feeSpark} />
          <KpiCard label="Commissions Paid" value={fmtK(data.totalCommissions)} prev={data.prevCommissions}   current={data.totalCommissions} color={C.amber}  icon="🔗" spark={commSpark} />
          <KpiCard label="Total Orders"     value={data.totalOrders.toLocaleString()} prev={data.prevOrders}  current={data.totalOrders}     color={C.cyan}   icon="📋" spark={ordSpark} />
          <KpiCard label="Avg Order Value"  value={fmtK(data.avgOrderValue)}   prev={data.prevAvgOrderValue}  current={data.avgOrderValue}   color={C.green}  icon="📊" />
          <KpiCard label="Delivery Rate"    value={pct(data.deliveryRate)}     prev={50}                      current={data.deliveryRate}    color={C.green}  icon="✅" />
          <KpiCard label="Cancellation Rate" value={pct(data.cancellationRate)} prev={data.cancellationRate}  current={0}                    color={C.red}    icon="⚠️" invertDelta />
          <KpiCard label="M-Pesa Success"   value={pct(data.mpesa.successRate)} prev={80}                    current={data.mpesa.successRate} color={C.green} icon="📱" />
        </div>

        {/* Revenue chart */}
        <div style={{ marginBottom: 18 }}>
          <Section title="Revenue Over Time" subtitle={`${data.dailyRevenue.length} data points · ${period === "12m" ? "monthly" : "daily"}`}
            topAction={
              <div style={{ display: "flex", gap: 5 }}>
                {(["revenue","breakdown","orders"] as const).map((t) => (
                  <button key={t} className={`ctab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            }
          >
            {activeTab === "revenue" && (
              <><Legend items={[{ label: "Revenue", color: C.purple }]} /><div style={{ height: 220 }}><LineChart data={chartData} lines={[{ key: "revenue", color: C.purple, label: "Revenue" }]} height={220} /></div></>
            )}
            {activeTab === "breakdown" && (
              <><Legend items={[{ label: "Revenue", color: C.purple }, { label: "Commissions", color: C.amber }, { label: "Platform Fees", color: C.blue }]} /><div style={{ height: 220 }}><LineChart data={chartData} lines={[{ key: "revenue", color: C.purple, label: "Revenue" }, { key: "commissions", color: C.amber, label: "Commissions" }, { key: "platformFees", color: C.blue, label: "Platform Fees" }]} height={220} /></div></>
            )}
            {activeTab === "orders" && (
              <><Legend items={[{ label: "Orders", color: C.cyan }]} /><div style={{ height: 220 }}><LineChart data={chartData} lines={[{ key: "orders", color: C.cyan, label: "Orders" }]} height={220} /></div></>
            )}
          </Section>
        </div>

        {/* Timing insights */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <Section title="🕐 Orders by Hour of Day" subtitle={peakHour ? `Peak: ${fmtHour(peakHour.hour)} (${peakHour.orders} orders) · EAT` : "No data"} accentColor={C.purple}>
            <HourChart data={data.hourOfDay} />
          </Section>
          <Section title="📅 Revenue by Day of Week" subtitle={peakDay ? `Best: ${peakDay.label} · ${fmtK(peakDay.revenue)}` : "No data"} accentColor={C.cyan}>
            <DayOfWeekChart data={data.dayOfWeek} />
          </Section>
        </div>

        {/* Funnel + Status + Customer loyalty */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 240px", gap: 16, marginBottom: 18 }}>
          <Section title="Order Funnel" subtitle="Count & value at each stage">
            <FunnelChart data={data.orderFunnel} />
          </Section>
          <Section title="Status Mix">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Donut slices={statusSlices} size={130} centerLabel={String(data.totalOrders)} centerSub="orders" />
              <div style={{ width: "100%" }}>
                {statusSlices.filter((s) => s.value > 0).map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                      <span style={{ color: "#6b7280" }}>{s.label.charAt(0) + s.label.slice(1).toLowerCase()}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
          <Section title="👤 Customer Loyalty" subtitle="Repeat vs first-time (by phone)">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <Donut slices={custSlices} size={120} centerLabel={pct(data.customerRepeat.repeatRate, 0)} centerSub="repeat" />
              <div style={{ width: "100%" }}>
                {[{ label: "First-time", color: C.purple, value: data.customerRepeat.firstTime }, { label: "Repeat", color: C.green, value: data.customerRepeat.repeat }].map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} /> {s.label}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.value}</span>
                  </div>
                ))}
                <div style={{ background: C.purpleLight, borderRadius: 8, padding: "8px 12px", textAlign: "center", marginTop: 4 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>{pct(data.customerRepeat.repeatRate)}</div>
                  <div style={{ fontSize: 10, color: C.purple, opacity: 0.7, fontWeight: 600 }}>REPEAT RATE</div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Leaderboards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <Section title="🏪 Top Vendors" subtitle="By revenue · selected period" accentColor={C.purple}>
            {data.topVendors.length === 0
              ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No vendor data yet</p>
              : data.topVendors.map((v, i) => (
                  <LeaderRow key={v.vendorId} rank={i + 1}
                    primary={v.shopName}   // ✅ shopName
                    secondary={`${v.totalOrders} orders · ${v.delivered} delivered`}
                    value={fmtK(v.totalRevenue)} subValue={`avg ${fmtK(v.avgOrderValue)}`}
                    color={C.purple} badge={i === 0 ? "🏆 #1" : undefined} />
                ))}
          </Section>
          <Section title="🔗 Top Affiliates" subtitle="By commissions earned" accentColor={C.amber}>
            {data.topAffiliates.length === 0
              ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No affiliate data yet</p>
              : data.topAffiliates.map((a, i) => (
                  <LeaderRow key={a.affiliateId} rank={i + 1}
                    primary={a.fullName}   // ✅ fullName
                    secondary={a.email}
                    value={fmtK(a.totalCommissions)} subValue={`${a.conversionOrders} conversions`}
                    color={C.amber} badge={i === 0 ? "⭐ Best" : undefined} />
                ))}
          </Section>
        </div>

        {/* Top Products */}
        <div style={{ marginBottom: 18 }}>
          <Section title="📦 Top Products" subtitle="By revenue · selected period" accentColor={C.blue}>
            {data.topProducts.length === 0
              ? <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No product sales yet</p>
              : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                        {["#", "Product", "Vendor", "Revenue", "Units", "Orders"].map((h) => (
                          <th key={h} style={{ padding: "6px 10px", textAlign: ["Revenue","Units","Orders"].includes(h) ? "right" : h === "#" ? "center" : "left", color: "#9ca3af", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => (
                        <tr key={p.productId} style={{ borderBottom: "1px solid #f9fafb" }}>
                          <td style={{ padding: "9px 10px", textAlign: "center" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", margin: "0 auto", background: i < 3 ? C.purple : "#f3f4f6", color: i < 3 ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{i + 1}</div>
                          </td>
                          <td style={{ padding: "9px 10px", fontWeight: 600, color: "#111827" }}>{p.productTitle}</td>  {/* ✅ productTitle */}
                          <td style={{ padding: "9px 10px", color: "#6b7280" }}>{p.vendorShopName}</td>              {/* ✅ vendorShopName */}
                          <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: C.purple }}>{fmtK(p.totalRevenue)}</td>
                          <td style={{ padding: "9px 10px", textAlign: "right", color: "#374151" }}>{p.totalUnits}</td>
                          <td style={{ padding: "9px 10px", textAlign: "right", color: "#374151" }}>{p.totalOrders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Section>
        </div>

        {/* M-Pesa + Payouts + User Growth */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 280px 1fr", gap: 16, marginBottom: 18 }}>

          {/* M-Pesa — ✅ SUCCESS not PAID */}
          <Section title="📱 M-Pesa Health" accentColor={C.green}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Donut slices={mpesaSlices.filter(s => s.value > 0)} size={110} centerLabel={pct(data.mpesa.successRate, 0)} centerSub="success" />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                {mpesaSlices.map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                      <span style={{ color: "#6b7280" }}>{s.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Total Txns", value: String(data.mpesa.total) },
                  { label: "Volume",     value: fmtK(data.mpesa.totalVolume) },
                  { label: "Avg Amount", value: fmtK(data.mpesa.avgAmount) },
                  { label: "Timeouts",   value: String(data.mpesa.timeout) },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginTop: 2 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Payouts */}
          <Section title="💸 Payout Requests" subtitle="All-time summary" accentColor={C.amber}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "🕐 Pending",  count: data.payouts.pendingCount,  amount: data.payouts.pendingAmount,  color: C.amber, bg: "#fffbeb" },
                { label: "✅ Approved", count: data.payouts.approvedCount, amount: data.payouts.approvedAmount, color: C.cyan,  bg: "#ecfeff" },
                { label: "✓ Paid Out", count: data.payouts.paidCount,     amount: data.payouts.paidAmount,     color: C.green, bg: "#f0fdf4" },
                { label: "✕ Rejected", count: data.payouts.rejectedCount, amount: 0,                           color: C.red,   bg: "#fef2f2" },
              ].map((r) => (
                <div key={r.label} style={{ background: r.bg, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{r.count}</span>
                  </div>
                  {r.amount > 0 && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{fmtK(r.amount)}</div>}
                </div>
              ))}
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "Vendor", count: data.payouts.vendorPending, color: C.purple, bg: C.purpleLight },
                  { label: "Affiliate", count: data.payouts.affiliatePending, color: C.amber, bg: "#fffbeb" },
                ].map((s) => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: s.color, textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>pending</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* User Growth — ✅ VENDOR | AFFILIATE | BOTH (no CUSTOMER) */}
          <Section title="👥 New Signups" subtitle="Vendors & Affiliates per day" accentColor={C.blue}>
            <Legend items={[{ label: "Vendors", color: C.green }, { label: "Affiliates", color: C.amber }]} />
            <div style={{ height: 200 }}>
              <LineChart
                data={data.userGrowth.map((d) => ({ date: d.date, vendors: d.vendors, affiliates: d.affiliates }))}
                lines={[{ key: "vendors", color: C.green, label: "Vendors" }, { key: "affiliates", color: C.amber, label: "Affiliates" }]}
                height={200}
              />
            </div>
          </Section>
        </div>

        <div style={{ textAlign: "center", color: "#d1d5db", fontSize: 11, paddingBottom: 16 }}>
          AffilMarket Admin · Cancelled orders excluded from revenue · Customer loyalty tracked by phone number
        </div>
      </div>
    </>
  );
}
