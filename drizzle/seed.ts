// import { db } from '@/lib/db';
import 'dotenv/config';
import {
  users, accounts, vendorProfiles, affiliateProfiles,
  balances, categories as categoriesTable, platformSettings,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/utils/db';
import { auth } from '@/lib/utils/auth';

async function seed() {
  console.log('🌱 Seeding AffilMarket Kenya database...');

  // ── Platform Settings ──────────────────────────────────────
  const settings = [
    { key: 'platform_fee_rate',              value: '0.05' },
    { key: 'platform_fixed_fee',             value: '10'   },
    { key: 'min_payout_threshold_vendor',    value: '500'  },
    { key: 'min_payout_threshold_affiliate', value: '200'  },
    { key: 'affiliate_cookie_days',          value: '30'   },
    { key: 'balance_release_days',           value: '7'    },
  ];

  for (const s of settings) {
    const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, s.key)).limit(1);
    if (!existing.length) await db.insert(platformSettings).values(s);
  }
  console.log('✅ Platform settings seeded');

  // ── Categories ─────────────────────────────────────────────
  const cats = [
    { name: 'Electronics',      slug: 'electronics',    icon: '📱' },
    { name: 'Fashion',          slug: 'fashion',        icon: '👗' },
    { name: 'Home & Garden',    slug: 'home-garden',    icon: '🏡' },
    { name: 'Health & Beauty',  slug: 'health-beauty',  icon: '💄' },
    { name: 'Food & Groceries', slug: 'food-groceries', icon: '🛒' },
    { name: 'Sports & Outdoors',slug: 'sports-outdoors',icon: '⚽' },
    { name: 'Books & Education',slug: 'books-education',icon: '📚' },
    { name: 'Automotive',       slug: 'automotive',     icon: '🚗' },
    { name: 'Baby & Kids',      slug: 'baby-kids',      icon: '🧸' },
    { name: 'Services',         slug: 'services',       icon: '🔧' },
  ];

  for (const cat of cats) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug)).limit(1);
    if (!existing.length) await db.insert(categoriesTable).values({ id: crypto.randomUUID(), ...cat });
  }
  console.log('✅ Categories seeded');

  // ── Helper ─────────────────────────────────────────────────
  async function upsertUser({
    email, password, name, phone, role, status, emailVerified,
  }: {
    email: string; password: string; name: string;
    phone: string; role: any; status: any; emailVerified: boolean;
  }) {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return existing[0].id;

    // ✅ Use Better Auth — it handles password hashing correctly
    const result = await auth.api.signUpEmail({
      body: { name, email, password, role, phone },
    });

    if (!result?.user) throw new Error(`Failed to create: ${email}`);

    // Update fields Better Auth doesn't set
    await db.update(users)
      .set({ status, emailVerified })
      .where(eq(users.id, result.user.id));

    return result.user.id;
  }

  // ── Admin ──────────────────────────────────────────────────
  const adminId = await upsertUser({
    email: 'admin@affilmarket.co.ke', password: 'Admin@AffilMarket2026!',
    name: 'AffilMarket Admin', phone: '+254700000000',
    role: 'ADMIN', status: 'active', emailVerified: true,
  });

  const adminBal = await db.select().from(balances).where(eq(balances.userId, adminId)).limit(1);
  if (!adminBal.length) await db.insert(balances).values({ id: crypto.randomUUID(), userId: adminId });
  console.log('✅ Admin seeded: admin@affilmarket.co.ke');

  // ── Demo Vendor ────────────────────────────────────────────
  const vendorId = await upsertUser({
    email: 'vendor@demo.co.ke', password: 'Vendor@Demo123!',
    name: 'TechHub Kenya', phone: '+254711111111',
    role: 'VENDOR', status: 'active', emailVerified: true,
  });

  const vendorExists = await db.select().from(vendorProfiles).where(eq(vendorProfiles.userId, vendorId)).limit(1);
  if (!vendorExists.length) {
    await db.insert(vendorProfiles).values({
      id: crypto.randomUUID(), userId: vendorId,
      shopName: 'TechHub Kenya', legalName: 'TechHub Kenya Ltd',
      phone: '+254711111111',
      shopAddress: { city: 'Nairobi', area: 'Westlands', country: 'KE' },
      description: 'Your one-stop shop for quality electronics in Kenya.',
      status: 'approved',
    });
    await db.insert(balances).values({
      id: crypto.randomUUID(), userId: vendorId,
      pendingBalance: '12500', availableBalance: '8000',
    });
  }
  console.log('✅ Vendor seeded: vendor@demo.co.ke');

  // ── Demo Affiliate ─────────────────────────────────────────
  const affiliateId = await upsertUser({
    email: 'affiliate@demo.co.ke', password: 'Affiliate@Demo123!',
    name: 'Jane Muthoni', phone: '+254722222222',
    role: 'AFFILIATE', status: 'active', emailVerified: true,
  });

  const affExists = await db.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, affiliateId)).limit(1);
  if (!affExists.length) {
    await db.insert(affiliateProfiles).values({
      id: crypto.randomUUID(), userId: affiliateId,
      fullName: 'Jane Muthoni', phone: '+254722222222',
      affiliateToken: 'DEMO_JANE_2026', mpesaPhone: '+254722222222',
      status: 'active',
    });
    await db.insert(balances).values({
      id: crypto.randomUUID(), userId: affiliateId,
      pendingBalance: '3200', availableBalance: '1500',
    });
  }
  console.log('✅ Affiliate seeded: affiliate@demo.co.ke');

  console.log('\n🎉 Seeding complete!');
  console.log('Admin:     admin@affilmarket.co.ke  /  Admin@AffilMarket2026!');
  console.log('Vendor:    vendor@demo.co.ke        /  Vendor@Demo123!');
  console.log('Affiliate: affiliate@demo.co.ke     /  Affiliate@Demo123!');
}

seed()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => process.exit(0));
