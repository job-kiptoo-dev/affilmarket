import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/components/providers/query-provider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'AffilMarket Kenya — Affiliate Marketplace',
    template: '%s | AffilMarket Kenya',
  },
  description:
    'Kenya\'s leading affiliate marketplace. Sell products, earn commissions, grow your business. Pay with M-Pesa.',
  keywords: ['affiliate marketing', 'Kenya', 'M-Pesa', 'e-commerce', 'online shopping'],
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'AffilMarket Kenya',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
