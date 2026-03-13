'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, LayoutDashboard, Package, ShoppingCart, Users, DollarSign, BarChart2, CreditCard, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

type Role = 'AFFILIATE' | 'VENDOR' | 'ADMIN';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

const NAV_MAP: Record<Role, NavItem[]> = {
  AFFILIATE: [
    { icon: <LayoutDashboard size={16} />, label: 'Overview',     href: '/affiliate' },
    { icon: <Package size={16} />,         label: 'Products',     href: '/affiliate/products' },
    { icon: <BarChart2 size={16} />,        label: 'Analytics',    href: '/affiliate/analytics' },
    { icon: <DollarSign size={16} />,       label: 'Commissions',  href: '/affiliate/commissions' },
    { icon: <CreditCard size={16} />,       label: 'Payouts',      href: '/affiliate/payouts' },
    { icon: <Settings size={16} />,         label: 'Settings',     href: '/affiliate/settings' },
  ],
  VENDOR: [
    { icon: <LayoutDashboard size={16} />, label: 'Overview',     href: '/vendor' },
    { icon: <Package size={16} />,         label: 'Products',     href: '/vendor/products' },
    { icon: <ShoppingCart size={16} />,    label: 'Orders',       href: '/vendor/orders' },
    { icon: <BarChart2 size={16} />,        label: 'Analytics',    href: '/vendor/analytics' },
    { icon: <DollarSign size={16} />,       label: 'Earnings',     href: '/vendor/earnings' },
    { icon: <CreditCard size={16} />,       label: 'Payouts',      href: '/vendor/payouts' },
    { icon: <Settings size={16} />,         label: 'Settings',     href: '/vendor/settings' },
  ],
  ADMIN: [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard',    href: '/admin' },
    { icon: <Users size={16} />,            label: 'Users',        href: '/admin/users' },
    { icon: <Package size={16} />,         label: 'Products',     href: '/admin/products' },
    { icon: <ShoppingCart size={16} />,    label: 'Orders',       href: '/admin/orders' },
    { icon: <DollarSign size={16} />,       label: 'Payouts',      href: '/admin/payouts' },
    { icon: <BarChart2 size={16} />,        label: 'Analytics',    href: '/admin/analytics' },
    { icon: <Settings size={16} />,         label: 'Settings',     href: '/admin/settings' },
  ],
};

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  AFFILIATE: { label: 'Affiliate',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  VENDOR:    { label: 'Vendor',     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  ADMIN:     { label: 'Admin',      color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
};

interface DashboardShellProps {
  children: React.ReactNode;
  role: Role;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const navItems = NAV_MAP[role] || NAV_MAP.AFFILIATE;
  const roleConf = ROLE_CONFIG[role];

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U';
  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        .ds-root {
          display: flex; min-height: 100vh;
          background: #f8f9fb;
          font-family: 'DM Sans', -apple-system, sans-serif;
        }

        /* ── SIDEBAR ── */
        .ds-sidebar {
          width: 232px; flex-shrink: 0;
          background: #fff; border-right: 1px solid #e5e7eb;
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 80; overflow-y: auto;
          transition: transform 0.25s;
        }

        .ds-sidebar-header {
          height: 62px; display: flex; align-items: center;
          padding: 0 18px; border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0; gap: 8px;
        }

        .ds-logo-icon {
          width: 32px; height: 32px; border-radius: 7px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ds-logo-text {
          font-size: 16.5px; font-weight: 800;
          letter-spacing: -0.035em; line-height: 1;
        }
        .ds-logo-text .green { color: #16a34a; }
        .ds-logo-text .dark  { color: #111; }

        .ds-nav-section {
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #9ca3af; padding: 16px 16px 6px;
          margin-top: 4px;
        }

        .ds-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px; border-radius: 9px;
          margin: 0 8px 1px; cursor: pointer;
          font-size: 14px; font-weight: 500; color: #374151;
          text-decoration: none; transition: all 0.14s;
          position: relative;
        }
        .ds-nav-item:hover { background: #f3f4f6; color: #111; }
        .ds-nav-item.active {
          background: #f0fdf4; color: #16a34a; font-weight: 600;
        }
        .ds-nav-item.active svg { color: #16a34a; }

        .ds-nav-item svg { flex-shrink: 0; color: #9ca3af; transition: color 0.14s; }
        .ds-nav-item:hover svg { color: #374151; }

        .ds-nav-badge {
          margin-left: auto; background: #dc2626; color: #fff;
          font-size: 10px; font-weight: 700; border-radius: 100px;
          padding: 1px 6px; min-width: 18px; text-align: center;
        }
        .ds-nav-item.active .ds-nav-badge { background: #16a34a; }

        /* Active left bar */
        .ds-nav-item.active::before {
          content: '';
          position: absolute; left: -8px; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 20px;
          background: #16a34a; border-radius: 0 3px 3px 0;
        }

        .ds-sidebar-spacer { flex: 1; }

        .ds-sidebar-footer {
          padding: 12px 8px; border-top: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .ds-user-card {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 10px; border-radius: 10px;
          background: #f9fafb; border: 1px solid #e5e7eb;
          margin-bottom: 8px;
        }

        .ds-user-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #15803d);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
        }

        .ds-user-name {
          font-size: 13px; font-weight: 700; color: #111;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 110px; line-height: 1.2;
        }

        .ds-user-role {
          display: inline-flex; align-items: center;
          border-radius: 100px; padding: 1px 7px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; margin-top: 2px;
        }

        .ds-logout-btn {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 12px; border-radius: 9px;
          width: 100%; background: none; border: none;
          font-size: 13.5px; font-weight: 500; color: #6b7280;
          cursor: pointer; transition: all 0.14s;
          font-family: 'DM Sans', sans-serif; text-align: left;
        }
        .ds-logout-btn:hover { background: #fef2f2; color: #dc2626; }

        /* ── TOPBAR (mobile + desktop) ── */
        .ds-topbar {
          height: 62px; background: #fff;
          border-bottom: 1px solid #e5e7eb;
          display: flex; align-items: center;
          padding: 0 24px; gap: 14px;
          position: sticky; top: 0; z-index: 70;
        }

        .ds-mobile-toggle {
          display: none;
          background: none; border: 1px solid #e5e7eb;
          border-radius: 8px; padding: 7px;
          cursor: pointer; color: #374151;
          align-items: center; justify-content: center;
        }

        .ds-page-title {
          font-size: 15px; font-weight: 700; color: #111;
          letter-spacing: -0.02em;
        }

        .ds-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 13.5px; color: #6b7280;
        }
        .ds-breadcrumb a { color: #9ca3af; text-decoration: none; }
        .ds-breadcrumb a:hover { color: #374151; }
        .ds-breadcrumb .sep { color: #d1d5db; font-size: 11px; }
        .ds-breadcrumb .current { color: #111; font-weight: 600; }

        /* ── MAIN ── */
        .ds-main {
          flex: 1; margin-left: 232px;
          display: flex; flex-direction: column;
          min-height: 100vh;
        }

        .ds-content {
          padding: 28px 32px; flex: 1;
        }

        /* ── OVERLAY ── */
        .ds-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); z-index: 75;
          backdrop-filter: blur(2px);
        }

        @media (max-width: 960px) {
          .ds-sidebar {
            transform: translateX(-100%);
          }
          .ds-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          }
          .ds-main { margin-left: 0; }
          .ds-mobile-toggle { display: flex !important; }
          .ds-overlay.open { display: block; }
          .ds-content { padding: 20px 16px; }
        }
      `}</style>

      <div className="ds-root">

        {/* ── SIDEBAR ── */}
        <aside className={`ds-sidebar${sidebarOpen ? ' open' : ''}`}>

          {/* Logo */}
          <div className="ds-sidebar-header">
            <Link href="/" className="ds-logo-icon" style={{ textDecoration: 'none' }}>
              <ShoppingBag size={16} color="#fff" strokeWidth={2.5} />
            </Link>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="ds-logo-text">
                <span className="green">Affil</span><span className="dark">Market</span>
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav style={{ padding: '8px 0', flex: 1 }}>
            <div className="ds-nav-section">Navigation</div>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== `/${role}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ds-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && (
                    <span className="ds-nav-badge">{item.badge}</span>
                  )}
                  {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', color: '#16a34a' }} />}
                </Link>
              );
            })}
          </nav>

          <div className="ds-sidebar-spacer" />

          {/* Footer */}
          <div className="ds-sidebar-footer">
            <div className="ds-user-card">
              <div className="ds-user-avatar">{userInitials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="ds-user-name">{userName}</div>
                <span
                  className="ds-user-role"
                  style={{ background: roleConf.bg, color: roleConf.color, border: `1px solid ${roleConf.border}` }}
                >
                  {roleConf.label}
                </span>
              </div>
            </div>

            <button className="ds-logout-btn" onClick={logout}>
              <LogOut size={15} /> Log out
            </button>
          </div>
        </aside>

        {/* Overlay */}
        <div
          className={`ds-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── MAIN ── */}
        <div className="ds-main">

          {/* Topbar */}
          <header className="ds-topbar">
            <button
              className="ds-mobile-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="ds-breadcrumb">
              <Link href="/">AffilMarket</Link>
              <span className="sep">›</span>
              <span style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{role.toLowerCase()}</span>
              <span className="sep">›</span>
              <span className="current">
                {navItems.find(i => pathname === i.href || (i.href !== `/${role}` && pathname.startsWith(i.href)))?.label || 'Dashboard'}
              </span>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Right side topbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, color: '#16a34a',
              }}>
                📲 M-Pesa Active
              </div>

              <div style={{
                width: 34, height: 34, borderRadius: 50,
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer',
              }}>
                {userInitials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="ds-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
