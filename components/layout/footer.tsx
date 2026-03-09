import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AffilMarket</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Kenya's leading affiliate marketplace. Connecting vendors, affiliates, and customers.
            </p>
            <p className="text-xs mt-4">🇰🇪 Made for Kenya, expanding across Africa</p>
          </div>

          {/* For Vendors */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">For Vendors</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register?role=VENDOR" className="hover:text-white transition-colors">Start Selling</Link></li>
              <li><Link href="/vendor" className="hover:text-white transition-colors">Vendor Dashboard</Link></li>
              <li><Link href="/legal/vendor-agreement" className="hover:text-white transition-colors">Vendor Agreement</Link></li>
              <li><Link href="/help/vendors" className="hover:text-white transition-colors">Vendor Guide</Link></li>
            </ul>
          </div>

          {/* For Affiliates */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">For Affiliates</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register?role=AFFILIATE" className="hover:text-white transition-colors">Become an Affiliate</Link></li>
              <li><Link href="/affiliate" className="hover:text-white transition-colors">Affiliate Dashboard</Link></li>
              <li><Link href="/legal/affiliate-agreement" className="hover:text-white transition-colors">Affiliate Agreement</Link></li>
              <li><Link href="/help/affiliates" className="hover:text-white transition-colors">Affiliate Guide</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/help/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><a href="mailto:support@affilmarket.co.ke" className="hover:text-white transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© {year} AffilMarket Kenya Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs">
            <span>Payments secured by</span>
            <span className="bg-green-900 text-green-400 px-2 py-1 rounded font-bold">M-Pesa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
