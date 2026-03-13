'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Menu, X, ChevronDown, Bell, User, LogOut, LayoutDashboard, Package, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const NAV_LINKS = [
  {
    label: 'Solutions',
    dropdown: [
      { label: '🏪 For Vendors', desc: 'List & sell products', href: '/register?role=VENDOR' },
      { label: '🤝 For Affiliates', desc: 'Earn commissions', href: '/register?role=AFFILIATE' },
      { label: '🛒 For Buyers', desc: 'Shop the marketplace', href: '/products' },
    ],
  },
  { label: 'Features & Pricing', href: '/pricing' },
  {
    label: 'More',
    dropdown: [
      { label: '📖 About Us', desc: 'Our story & mission', href: '/about' },
      { label: '💬 Blog', desc: 'Tips & guides', href: '/blog' },
      { label: '❓ Help Center', desc: 'FAQs & support', href: '/help' },
      { label: '📞 Contact', desc: 'Get in touch', href: '/contact' },
    ],
  },
  { label: 'For Buyers', href: '/products' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownTimeout = useRef<NodeJS.Timeout>();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();

  const dashboardLink =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'AFFILIATE'
      ? '/affiliate'
      : '/vendor';

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDropdownEnter = (label: string) => {
    clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 180);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        .am-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          height: 62px;
          display: flex;
          align-items: center;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          transition: box-shadow 0.25s;
        }
        .am-navbar.scrolled {
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
        }

        .am-nav-inner {
          width: 100%;
          max-width: 100%;
          padding: 0 28px;
          display: flex;
          align-items: center;
          gap: 0;
          height: 100%;
        }

        /* ── LOGO ── */
        .am-logo {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0; margin-right: 36px;
        }
        .am-logo-icon {
          width: 33px; height: 33px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .am-logo-wordmark {
          font-size: 17.5px; font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1;
          font-family: 'DM Sans', sans-serif;
        }
        .am-logo-wordmark .green { color: #16a34a; }
        .am-logo-wordmark .dark  { color: #111; }

        /* ── NAV LINKS ── */
        .am-nav-links {
          display: flex; align-items: center; gap: 2px; flex: 1;
        }

        .am-nav-link {
          position: relative;
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 14.5px; font-weight: 500; color: #374151;
          padding: 8px 12px; border-radius: 7px;
          cursor: pointer; text-decoration: none;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap; user-select: none;
          font-family: 'DM Sans', sans-serif;
        }
        .am-nav-link:hover { background: #f5f5f5; color: #111; }
        .am-nav-link.has-dropdown:hover { background: #f5f5f5; }

        .am-chevron {
          color: #9ca3af; transition: transform 0.2s; flex-shrink: 0;
          margin-top: 1px;
        }
        .am-nav-link.open .am-chevron { transform: rotate(180deg); }

        /* ── DROPDOWN ── */
        .am-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
          padding: 6px;
          min-width: 220px;
          z-index: 200;
          animation: dropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .am-dropdown-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          text-decoration: none; cursor: pointer;
          transition: background 0.12s;
        }
        .am-dropdown-item:hover { background: #f9fafb; }

        .am-dropdown-item-label {
          font-size: 14px; font-weight: 600; color: #111;
          font-family: 'DM Sans', sans-serif; line-height: 1.3;
        }
        .am-dropdown-item-desc {
          font-size: 12px; color: #9ca3af; margin-top: 1px;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── RIGHT SIDE ── */
        .am-nav-right {
          display: flex; align-items: center; gap: 4px; flex-shrink: 0;
        }

        .am-vdivider {
          width: 1px; height: 26px; background: #e5e7eb; margin: 0 6px;
          flex-shrink: 0;
        }

        .am-cancel-link {
          display: flex; align-items: center; gap: 3px;
          font-size: 13.5px; color: #374151; font-weight: 400;
          text-decoration: underline; text-underline-offset: 2px;
          text-decoration-color: #9ca3af;
          padding: 6px 10px; border-radius: 7px;
          cursor: pointer; white-space: nowrap;
          transition: background 0.15s, color 0.15s;
          font-family: 'DM Sans', sans-serif;
          text-decoration-skip-ink: none;
        }
        .am-cancel-link:hover { background: #f5f5f5; color: #111; text-decoration-color: #111; }

        .am-login-btn {
          font-size: 14px; font-weight: 500; color: #374151;
          padding: 8px 14px; border-radius: 7px;
          cursor: pointer; transition: background 0.15s, color 0.15s;
          text-decoration: none; white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }
        .am-login-btn:hover { background: #f5f5f5; color: #111; }

        .am-cta-btn {
          display: inline-flex; align-items: center;
          background: #111; color: #fff;
          font-size: 14px; font-weight: 600;
          padding: 9px 18px; border-radius: 7px;
          cursor: pointer; text-decoration: none;
          white-space: nowrap; transition: background 0.2s;
          font-family: 'DM Sans', sans-serif;
          border: none;
        }
        .am-cta-btn:hover { background: #000; }

        .am-lang-btn {
          display: flex; align-items: center; gap: 3px;
          font-size: 13px; font-weight: 500; color: #6b7280;
          padding: 6px 8px; border-radius: 7px;
          cursor: pointer; background: none; border: none;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .am-lang-btn:hover { background: #f5f5f5; color: #374151; }

        /* ── USER MENU (authenticated) ── */
        .am-user-trigger {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 10px 5px 5px;
          border: 1px solid #e5e7eb; border-radius: 22px;
          cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
          background: #fff;
        }
        .am-user-trigger:hover { border-color: #d1d5db; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }

        .am-user-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #15803d);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
        }

        .am-user-name {
          font-size: 13.5px; font-weight: 600; color: #111;
          font-family: 'DM Sans', sans-serif;
          max-width: 100px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .am-user-role-tag {
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: #16a34a;
        }

        .am-user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          padding: 6px;
          min-width: 200px;
          z-index: 200;
          animation: dropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }

        .am-user-menu-header {
          padding: 10px 12px 8px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 4px;
        }
        .am-user-email {
          font-size: 12px; color: #9ca3af;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-family: 'DM Sans', sans-serif;
        }

        .am-user-menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          font-size: 14px; font-weight: 500; color: #374151;
          cursor: pointer; text-decoration: none;
          transition: background 0.12s;
          font-family: 'DM Sans', sans-serif;
        }
        .am-user-menu-item:hover { background: #f9fafb; color: #111; }
        .am-user-menu-item.danger:hover { background: #fef2f2; color: #dc2626; }

        .am-user-menu-divider {
          height: 1px; background: #f3f4f6; margin: 4px 0;
        }

        /* ── MOBILE ── */
        .am-mobile-toggle {
          display: none;
          background: none; border: 1px solid #e5e7eb;
          border-radius: 8px; padding: 7px;
          cursor: pointer; color: #374151;
          align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .am-mobile-toggle:hover { background: #f5f5f5; }

        .am-mobile-menu {
          position: absolute;
          top: 62px; left: 0; right: 0;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          padding: 16px 20px 20px;
          z-index: 999;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .am-mobile-link {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 4px;
          font-size: 15px; font-weight: 500; color: #374151;
          text-decoration: none; border-bottom: 1px solid #f3f4f6;
          cursor: pointer; transition: color 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .am-mobile-link:last-of-type { border-bottom: none; }
        .am-mobile-link:hover { color: #16a34a; }

        .am-mobile-actions {
          display: flex; flex-direction: column; gap: 10px;
          padding-top: 14px; margin-top: 4px;
          border-top: 1px solid #e5e7eb;
        }

        .am-mobile-btn-outline {
          display: block; text-align: center;
          border: 1.5px solid #e5e7eb; border-radius: 9px;
          padding: 11px; font-size: 14.5px; font-weight: 600;
          color: #374151; text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .am-mobile-btn-outline:hover { border-color: #111; background: #f9fafb; }

        .am-mobile-btn-solid {
          display: block; text-align: center;
          background: #111; border-radius: 9px;
          padding: 11px; font-size: 14.5px; font-weight: 700;
          color: #fff; text-decoration: none;
          transition: background 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .am-mobile-btn-solid:hover { background: #000; }

        .am-mobile-btn-green {
          display: block; text-align: center;
          background: #16a34a; border-radius: 9px;
          padding: 11px; font-size: 14.5px; font-weight: 700;
          color: #fff; text-decoration: none;
          transition: background 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .am-mobile-btn-green:hover { background: #15803d; }

        @media (max-width: 960px) {
          .am-nav-links  { display: none !important; }
          .am-cancel-link { display: none !important; }
          .am-vdivider   { display: none !important; }
          .am-lang-btn   { display: none !important; }
          .am-desktop-auth { display: none !important; }
          .am-mobile-toggle { display: flex !important; }
        }
      `}</style>

      <header className={`am-navbar${scrolled ? ' scrolled' : ''}`} style={{ position: 'sticky', top: 0 }}>
        <div className="am-nav-inner">

          {/* ── Logo ── */}
          <Link href="/" className="am-logo">
            <div className="am-logo-icon">
              <ShoppingBag size={17} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="am-logo-wordmark">
              <span className="green">Affil</span><span className="dark">Market</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="am-nav-links">
            {NAV_LINKS.map((item) => (
              <div
                key={item.label}
                style={{ position: 'relative' }}
                onMouseEnter={() => item.dropdown && handleDropdownEnter(item.label)}
                onMouseLeave={handleDropdownLeave}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    className="am-nav-link"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div className={`am-nav-link has-dropdown${openDropdown === item.label ? ' open' : ''}`}>
                    {item.label}
                    <ChevronDown size={14} className="am-chevron" />
                  </div>
                )}

                {item.dropdown && openDropdown === item.label && (
                  <div
                    className="am-dropdown"
                    onMouseEnter={() => handleDropdownEnter(item.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    {item.dropdown.map((sub) => (
                      <Link key={sub.label} href={sub.href} className="am-dropdown-item">
                        <div>
                          <div className="am-dropdown-item-label">{sub.label}</div>
                          <div className="am-dropdown-item-desc">{sub.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop Right Side ── */}
          <div className="am-nav-right am-desktop-auth" style={{ display: 'flex' }}>
            {user ? (
              /* ── Authenticated State ── */
              <>
                <Link href="/orders/find" className="am-cancel-link">
                  My Orders <span style={{ fontSize: 12 }}>›</span>
                </Link>
                <div className="am-vdivider" />

                {/* User menu */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                  <div
                    className="am-user-trigger"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="am-user-avatar">{userInitials}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span className="am-user-name">{user.email?.split('@')[0]}</span>
                      <span className="am-user-role-tag">{user.role}</span>
                    </div>
                    <ChevronDown
                      size={13}
                      style={{ color: '#9ca3af', transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'none', marginLeft: 2 }}
                    />
                  </div>

                  {userMenuOpen && (
                    <div className="am-user-menu">
                      <div className="am-user-menu-header">
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>
                          {user.email?.split('@')[0]}
                        </div>
                        <div className="am-user-email">{user.email}</div>
                      </div>

                      <Link href={dashboardLink} className="am-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                        <LayoutDashboard size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
                        Dashboard
                      </Link>
                      <Link href="/orders/find" className="am-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                        <Package size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
                        My Orders
                      </Link>
                      {(user.role === 'AFFILIATE' || user.role === 'BOTH') && (
                        <Link href="/affiliate/earnings" className="am-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                          <DollarSign size={15} style={{ color: '#6b7280', flexShrink: 0 }} />
                          Earnings
                        </Link>
                      )}

                      <div className="am-user-menu-divider" />

                      <button
                        className="am-user-menu-item danger"
                        style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                      >
                        <LogOut size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Unauthenticated State ── */
              <>
                <Link href="/orders/find" className="am-cancel-link">
                  Cancel My Order <span style={{ fontSize: 12 }}>›</span>
                </Link>
                <div className="am-vdivider" />
                <Link href="/login" className="am-login-btn">
                  Login
                </Link>
                <div className="am-vdivider" />
                <Link href="/register" className="am-cta-btn">
                  Get Started
                </Link>
                <button className="am-lang-btn">
                  EN <ChevronDown size={10} />
                </button>
              </>
            )}
          </div>

          {/* ── Mobile Toggle ── */}
          <button
            className="am-mobile-toggle"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen
              ? <X size={18} />
              : <Menu size={18} />
            }
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="am-mobile-menu">
            <Link href="/products" className="am-mobile-link" onClick={() => setMobileOpen(false)}>
              🛒 Shop
            </Link>
            <Link href="/register?role=VENDOR" className="am-mobile-link" onClick={() => setMobileOpen(false)}>
              🏪 Sell on AffilMarket
            </Link>
            <Link href="/register?role=AFFILIATE" className="am-mobile-link" onClick={() => setMobileOpen(false)}>
              🤝 Become an Affiliate
            </Link>
            <Link href="/pricing" className="am-mobile-link" onClick={() => setMobileOpen(false)}>
              💰 Features & Pricing
            </Link>
            <Link href="/orders/find" className="am-mobile-link" onClick={() => setMobileOpen(false)}>
              📦 Find My Order
            </Link>

            <div className="am-mobile-actions">
              {user ? (
                <>
                  <Link
                    href={dashboardLink}
                    className="am-mobile-btn-green"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    className="am-mobile-btn-outline"
                    style={{ border: '1.5px solid #e5e7eb', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onClick={() => { logout(); setMobileOpen(false); }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="am-mobile-btn-outline" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/register" className="am-mobile-btn-solid" onClick={() => setMobileOpen(false)}>
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
