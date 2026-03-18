import { PrismaClient, Role, UserStatus, VendorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AffilMarket Kenya database...');

  // ── Platform Settings ──────────────────────────────────────
  const settings = [
    { key: 'platform_fee_rate', value: '0.05' },
    { key: 'platform_fixed_fee', value: '10' },
    { key: 'min_payout_threshold_vendor', value: '500' },
    { key: 'min_payout_threshold_affiliate', value: '200' },
    { key: 'affiliate_cookie_days', value: '30' },
    { key: 'balance_release_days', value: '7' },
  ];
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ Platform settings seeded');

  // ── Categories ─────────────────────────────────────────────
  const categories = [
    { name: 'Electronics', slug: 'electronics', icon: '📱' },
    { name: 'Fashion', slug: 'fashion', icon: '👗' },
    { name: 'Home & Garden', slug: 'home-garden', icon: '🏡' },
    { name: 'Health & Beauty', slug: 'health-beauty', icon: '💄' },
    { name: 'Food & Groceries', slug: 'food-groceries', icon: '🛒' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', icon: '⚽' },
    { name: 'Books & Education', slug: 'books-education', icon: '📚' },
    { name: 'Automotive', slug: 'automotive', icon: '🚗' },
    { name: 'Baby & Kids', slug: 'baby-kids', icon: '🧸' },
    { name: 'Services', slug: 'services', icon: '🔧' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories seeded');

  // ── Admin User ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@AffilMarket2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@affilmarket.co.ke' },
    update: {},
    create: {
      email: 'admin@affilmarket.co.ke',
      passwordHash: adminPassword,
      phone: '+254700000000',
      role: Role.ADMIN,
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      balance: { create: {} },
    },
  });
  console.log('✅ Admin user seeded:', admin.email);

  // ── Demo Vendor ────────────────────────────────────────────
  const vendorPassword = await bcrypt.hash('Vendor@Demo123!', 12);
  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@demo.co.ke' },
    update: {},
    create: {
      email: 'vendor@demo.co.ke',
      passwordHash: vendorPassword,
      phone: '+254711111111',
      role: Role.VENDOR,
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      balance: { create: { pendingBalance: 12500, availableBalance: 8000 } },
      vendorProfile: {
        create: {
          shopName: 'TechHub Kenya',
          legalName: 'TechHub Kenya Ltd',
          phone: '+254711111111',
          shopAddress: { city: 'Nairobi', area: 'Westlands', country: 'KE' },
          description: 'Your one-stop shop for quality electronics in Kenya.',
          status: VendorStatus.approved,
        },
      },
    },
  });
  console.log('✅ Demo vendor seeded:', vendor.email);

  // ── Demo Affiliate ─────────────────────────────────────────
  const affiliatePassword = await bcrypt.hash('Affiliate@Demo123!', 12);
  const affiliate = await prisma.user.upsert({
    where: { email: 'affiliate@demo.co.ke' },
    update: {},
    create: {
      email: 'affiliate@demo.co.ke',
      passwordHash: affiliatePassword,
      phone: '+254722222222',
      role: Role.AFFILIATE,
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      balance: { create: { pendingBalance: 3200, availableBalance: 1500 } },
      affiliateProfile: {
        create: {
          fullName: 'Jane Muthoni',
          phone: '+254722222222',
          affiliateToken: 'DEMO_JANE_2026',
          mpesaPhone: '+254722222222',
          status: 'active',
        },
      },
    },
  });
  console.log('✅ Demo affiliate seeded:', affiliate.email);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo credentials:');
  console.log('Admin:     admin@affilmarket.co.ke / Admin@AffilMarket2026!');
  console.log('Vendor:    vendor@demo.co.ke / Vendor@Demo123!');
  console.log('Affiliate: affiliate@demo.co.ke / Affiliate@Demo123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
