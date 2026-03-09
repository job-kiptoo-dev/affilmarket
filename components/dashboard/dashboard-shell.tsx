'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  User,
  LogOut,
  Link2,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type DashboardRole = 'VENDOR' | 'AFFILIATE' | 'ADMIN';

const navItems: Record<DashboardRole, { href: string; label: string; icon: any }[]> = {
  VENDOR: [
    { href: '/vendor', label: 'Overview', icon: LayoutDashboard },
    { href: '/vendor/products', label: 'Products', icon: Package },
    { href: '/vendor/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/vendor/earnings', label: 'Earnings & Payouts', icon: Wallet },
    { href: '/vendor/profile', label: 'Profile & KYC', icon: User },
  ],
  AFFILIATE: [
    { href: '/affiliate', label: 'Overview', icon: LayoutDashboard },
    { href: '/affiliate/products', label: 'Products to Promote', icon: Package },
    { href: '/affiliate/commissions', label: 'Commissions', icon: TrendingUp },
    { href: '/affiliate/analytics', label: 'Click Analytics', icon: BarChart3 },
    { href: '/affiliate/payouts', label: 'Payouts', icon: Wallet },
    { href: '/affiliate/profile', label: 'Profile', icon: User },
  ],
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/vendors', label: 'Vendors', icon: ShieldCheck },
    { href: '/admin/affiliates', label: 'Affiliates', icon: Link2 },
    { href: '/admin/products', label: 'Products', icon: Package },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/payouts', label: 'Payouts', icon: Wallet },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

interface DashboardShellProps {
  children: React.ReactNode;
  role: DashboardRole;
  vendorName?: string;
}

export function DashboardShell({ children, role, vendorName }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const items = navItems[role];

  const roleLabel = role === 'VENDOR' ? 'Vendor' : role === 'AFFILIATE' ? 'Affiliate' : 'Admin';
  const roleColor = role === 'VENDOR' ? 'bg-green-100 text-green-700' : role === 'AFFILIATE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 brand-gradient rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-lg">
            <span className="brand-gradient-text">Affil</span>
            <span className="text-gray-900">Market</span>
          </span>
        </Link>
        <div className={cn('mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', roleColor)}>
          {roleLabel} Portal
        </div>
        {vendorName && (
          <p className="text-xs text-gray-500 mt-1 truncate">{vendorName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-green-light text-brand-green'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-brand-green' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all">
          <ShoppingBag className="w-4 h-4" />
          Back to Store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all mt-1"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar (mobile) */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-sm text-gray-900">AffilMarket</span>
          <div className="w-5" />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
