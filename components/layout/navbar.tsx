'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag, User, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const dashboardLink =
    user?.role === 'ADMIN'
      ? '/admin'
      : user?.role === 'AFFILIATE'
      ? '/affiliate'
      : '/vendor';

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl">
            <span className="brand-gradient-text">Affil</span>
            <span className="text-gray-900">Market</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/products" className="text-gray-600 hover:text-brand-green transition-colors text-sm font-medium">
            Shop
          </Link>
          <Link href="/register?role=VENDOR" className="text-gray-600 hover:text-brand-green transition-colors text-sm font-medium">
            Sell
          </Link>
          <Link href="/register?role=AFFILIATE" className="text-gray-600 hover:text-brand-green transition-colors text-sm font-medium">
            Earn
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={dashboardLink}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-green transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-green-light flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-green" />
                </div>
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-brand-green transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-brand-green text-white px-4 py-2 rounded-xl hover:bg-brand-green-dark transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <Link href="/products" className="block text-gray-700 font-medium py-2">Shop</Link>
          <Link href="/register?role=VENDOR" className="block text-gray-700 font-medium py-2">Sell on AffilMarket</Link>
          <Link href="/register?role=AFFILIATE" className="block text-gray-700 font-medium py-2">Become an Affiliate</Link>
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {user ? (
              <>
                <Link href={dashboardLink} className="block w-full text-center bg-brand-green text-white py-2 rounded-xl font-medium">
                  Dashboard
                </Link>
                <button onClick={logout} className="block w-full text-center text-gray-500 py-2">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block w-full text-center border border-gray-200 py-2 rounded-xl font-medium">
                  Log in
                </Link>
                <Link href="/register" className="block w-full text-center bg-brand-green text-white py-2 rounded-xl font-medium">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
