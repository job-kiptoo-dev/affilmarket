import 'dotenv/config';
import {
  users, accounts, vendorProfiles, affiliateProfiles,
  balances, categories as categoriesTable, platformSettings,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/utils/db';
import { auth } from '@/lib/utils/auth';

async function seed() {
  console.log('🌱 Starting AffilMarket Kenya Master Seed...');

  // ── 1. Platform Settings ──────────────────────────────────────
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

  // ── 2. Categories ─────────────────────────────────────────────
  const cats = [
    { name: 'Electronics',      slug: 'electronics',    icon: '📱' },
    { name: 'Fashion',          slug: 'fashion',        icon: '👗' },
    { name: 'Health & Beauty',  slug: 'health-beauty',  icon: '💄' },
    { name: 'Food & Groceries', slug: 'food-groceries', icon: '🛒' },
    { name: 'Services',         slug: 'services',       icon: '🔧' },
  ];

  for (const cat of cats) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug)).limit(1);
    if (!existing.length) await db.insert(categoriesTable).values({ id: crypto.randomUUID(), ...cat });
  }
  console.log('✅ Categories seeded');

  // ── 3. Helper: The "Better Auth" Safe Upsert ──────────────────
  async function upsertUser({
    email, password, name, role
  }: {
    email: string; password: string; name: string; role: 'ADMIN' | 'VENDOR' | 'AFFILIATE';
  }) {
    if (!email) throw new Error("Email is undefined in upsertUser");

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    
    if (existing.length) {
      console.log(`⏭️  User already exists: ${email}`);
      return existing[0].id;
    }

    console.log(`👤 Creating ${role}: ${email}...`);

    // We use Better Auth API to ensure the password hash is perfect
    const result = await auth.api.signUpEmail({
      body: { 
        name, 
        email, 
        password,
        role // Passing role here to satisfy "role is required"
      },
    });

    if (!result?.user) throw new Error(`Failed to create user: ${email}`);

    // Force verify and set status to active
    await db.update(users)
      .set({ 
        status: 'active', 
        emailVerified: true,
        role: role // Double-ensure role is set
      })
      .where(eq(users.id, result.user.id));

    return result.user.id;
  }

  // ── 4. Admin ──────────────────────────────────────────────────
  const adminId = await upsertUser({
    email: 'admin@affilmarket.co.ke',
    password: 'Admin@AffilMarket2026!',
    name: 'AffilMarket Admin',
    role: 'ADMIN',
  });

  const adminBal = await db.select().from(balances).where(eq(balances.userId, adminId)).limit(1);
  if (!adminBal.length) await db.insert(balances).values({ id: crypto.randomUUID(), userId: adminId });
  console.log('✅ Admin Ready');

  // ── 5. Demo Vendor ────────────────────────────────────────────
  const vendorId = await upsertUser({
    email: 'vendor@demo.co.ke',
    password: 'Vendor@Demo123!',
    name: 'TechHub Kenya',
    role: 'VENDOR',
  });

  const vendorExists = await db.select().from(vendorProfiles).where(eq(vendorProfiles.userId, vendorId)).limit(1);
  if (!vendorExists.length) {
    await db.insert(vendorProfiles).values({
      id: crypto.randomUUID(),
      userId: vendorId,
      shopName: 'TechHub Kenya',
      legalName: 'TechHub Kenya Ltd',
      phone: '+254711111111',
      status: 'approved',
    });
    await db.insert(balances).values({
      id: crypto.randomUUID(),
      userId: vendorId,
      pendingBalance: '12500',
      availableBalance: '8000',
    });
  }
  console.log('✅ Vendor Ready');

  // ── 6. Demo Affiliate ─────────────────────────────────────────
  const affiliateId = await upsertUser({
    email: 'affiliate@demo.co.ke',
    password: 'Affiliate@Demo123!',
    name: 'Jane Muthoni',
    role: 'AFFILIATE',
  });

  const affExists = await db.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, affiliateId)).limit(1);
  if (!affExists.length) {
    await db.insert(affiliateProfiles).values({
      id: crypto.randomUUID(),
      userId: affiliateId,
      fullName: 'Jane Muthoni',
      phone: '+254722222222',
      affiliateToken: 'JANE_2026',
      mpesaPhone: '+254722222222',
      status: 'active',
    });
    await db.insert(balances).values({
      id: crypto.randomUUID(),
      userId: affiliateId,
      pendingBalance: '3200',
      availableBalance: '1500',
    });
  }
  console.log('✅ Affiliate Ready');

  console.log('\n🎉 Master Seeding Complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
