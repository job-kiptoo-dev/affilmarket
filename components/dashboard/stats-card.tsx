import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Color = 'green' | 'blue' | 'amber' | 'purple' | 'red';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: Color;
  trend?: number; // positive or negative percentage
}

const COLOR_MAP: Record<Color, { icon_bg: string; icon_border: string; icon_color: string; badge_bg: string; badge_color: string }> = {
  green:  { icon_bg: '#f0fdf4', icon_border: '#bbf7d0', icon_color: '#16a34a', badge_bg: '#f0fdf4', badge_color: '#16a34a' },
  blue:   { icon_bg: '#eff6ff', icon_border: '#bfdbfe', icon_color: '#2563eb', badge_bg: '#eff6ff', badge_color: '#2563eb' },
  amber:  { icon_bg: '#fffbeb', icon_border: '#fde68a', icon_color: '#d97706', badge_bg: '#fffbeb', badge_color: '#d97706' },
  purple: { icon_bg: '#faf5ff', icon_border: '#e9d5ff', icon_color: '#7c3aed', badge_bg: '#faf5ff', badge_color: '#7c3aed' },
  red:    { icon_bg: '#fef2f2', icon_border: '#fecaca', icon_color: '#dc2626', badge_bg: '#fef2f2', badge_color: '#dc2626' },
};

export function StatsCard({ title, value, subtitle, icon, color = 'green', trend }: StatsCardProps) {
  const c = COLOR_MAP[color];
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <>
      <style>{`
        .sc-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 20px 22px;
          transition: box-shadow 0.2s, transform 0.2s;
          font-family: 'DM Sans', -apple-system, sans-serif;
        }
        .sc-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .sc-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; margin-bottom: 14px;
        }
        .sc-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sc-trend {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 11px; font-weight: 700;
          border-radius: 100px; padding: 3px 8px;
        }
        .sc-label {
          font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #9ca3af; margin-bottom: 4px;
        }
        .sc-value {
          font-size: 26px; font-weight: 800; color: #111;
          letter-spacing: -0.04em; line-height: 1.1;
          margin-bottom: 6px;
        }
        .sc-subtitle {
          font-size: 12.5px; color: #9ca3af;
          display: flex; align-items: center; gap: 4px;
        }
      `}</style>

      <div className="sc-card">
        <div className="sc-top">
          {icon && (
            <div
              className="sc-icon-wrap"
              style={{ background: c.icon_bg, border: `1px solid ${c.icon_border}` }}
            >
              <span style={{ color: c.icon_color }}>{icon}</span>
            </div>
          )}
          {trend !== undefined && (
            <span
              className="sc-trend"
              style={{
                background: trendUp ? '#f0fdf4' : '#fef2f2',
                color: trendUp ? '#16a34a' : '#dc2626',
              }}
            >
              {trendUp
                ? <ArrowUpRight size={11} />
                : <ArrowDownRight size={11} />
              }
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        <div className="sc-label">{title}</div>
        <div className="sc-value">{value}</div>

        {subtitle && (
          <div className="sc-subtitle">
            <span
              style={{
                background: c.badge_bg,
                color: c.badge_color,
                borderRadius: 100,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
