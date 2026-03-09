import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/products/product-card';
import { CategoryGrid } from '@/components/products/category-grid';
import { HeroSection } from '@/components/layout/hero-section';
import { HowItWorks } from '@/components/layout/how-it-works';
import { StatsBar } from '@/components/layout/stats-bar';

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { status: 'active' },
    include: { vendor: true, category: true },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });
}

async function getCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <HeroSection />

      {/* Stats */}
      <StatsBar />

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 mt-1">Browse thousands of products across Kenya</p>
          </div>
          <Link href="/products" className="text-brand-green hover:underline font-medium">
            View all →
          </Link>
        </div>
        <CategoryGrid categories={categories} />
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 max-w-7xl mx-auto bg-gray-50 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-500 mt-1">Top picks from verified vendors across Kenya</p>
          </div>
          <Link href="/products" className="text-brand-green hover:underline font-medium">
            See all products →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No products yet. Be the first vendor to list!</p>
            <Link
              href="/register?role=VENDOR"
              className="mt-4 inline-block bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors"
            >
              Start Selling
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* CTA Banners */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor CTA */}
          <div className="brand-gradient rounded-2xl p-8 text-white">
            <div className="text-4xl mb-4">🏪</div>
            <h3 className="text-2xl font-bold mb-2">Start Selling Today</h3>
            <p className="text-green-100 mb-6">
              List your products and reach thousands of customers across Kenya. Our affiliates
              will promote your products for free.
            </p>
            <Link
              href="/register?role=VENDOR"
              className="bg-white text-brand-green px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors inline-block"
            >
              Become a Vendor →
            </Link>
          </div>

          {/* Affiliate CTA */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-2xl font-bold mb-2">Earn Commissions</h3>
            <p className="text-amber-100 mb-6">
              Share affiliate links and earn up to 30% commission on every sale.
              Get paid via M-Pesa directly to your phone.
            </p>
            <Link
              href="/register?role=AFFILIATE"
              className="bg-white text-amber-600 px-6 py-3 rounded-xl font-semibold hover:bg-amber-50 transition-colors inline-block"
            >
              Become an Affiliate →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
