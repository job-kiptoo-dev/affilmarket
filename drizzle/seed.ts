import 'dotenv/config';
import { db } from '@/lib/utils/db';
import { auth } from '@/lib/utils/auth';
import { users, balances, affiliateProfiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  console.log('🚀 Running DIAGNOSTIC Seed...');

  const adminEmail = 'admin@affilmarket.co.ke';
  const plainPassword = 'Admin@AffilMarket2026!';


  // SAFETY CHECK: If this is > 32, we know why it's failing
  console.log(`Diagnostic: Password length is ${plainPassword.length} characters.`);

  try {
    console.log('🧹 Cleaning up old records...');
    await db.delete(users).where(eq(users.email, adminEmail));

    console.log('Registering via Better Auth API...');
    const response = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: plainPassword, // THIS MUST BE THE PLAIN STRING
        name: 'AffilMarket Admin',
        role: 'ADMIN',
      },
    });

    if (response) {
      console.log('Updating role to ADMIN...');
      await db.update(users)
        .set({ role: 'ADMIN', status: 'active', emailVerified: true })
        .where(eq(users.id, response.user.id));

      console.log('✅ Success! Try logging in now.');
    }
  } catch (error: any) {
    // This will help us see if the error is coming from validation
    console.error('❌ Better Auth rejected the request:');
    console.error(JSON.stringify(error.body || error.message, null, 2));
  }
}

seedAdmin().then(() => process.exit(0));


async function seedAffiliate(email: string, name: string, phone: string, token: string) {
    const affiliateEmail = 'Affiliate@affilmarket.co.ke';
    const plainPassword = 'Affiliate@AffilMarket2026!';
    const name1 = 'Affiliate User';


  console.log(`🌱 Seeding Affiliate: ${name1}...`);



  // 1. Create or Get User via Better Auth
  let userId: string;
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log(`⏭️  User exists, skipping creation.`);
  } else {
    const res = await auth.api.signUpEmail({
      body: { 
        email: affiliateEmail, 
        password: plainPassword,
        name : name1,
        role: 'AFFILIATE' 
      },
    });
    userId = res.user.id;
    // Set status/verified
    await db.update(users).set({ status: 'active', emailVerified: true }).where(eq(users.id, userId));
  }

  // 2. Create Affiliate Profile
  const existingProfile = await db.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId)).limit(1);
  if (!existingProfile.length) {
    await db.insert(affiliateProfiles).values({
      id: crypto.randomUUID(),
      userId,
      fullName: name,
      phone,
      affiliateToken: token,
      mpesaPhone: phone,
      status: 'active',
    });
    console.log(`✅ Profile created for ${name}`);
  }

  // 3. Initialize Balance
  const existingBal = await db.select().from(balances).where(eq(balances.userId, userId)).limit(1);
  if (!existingBal.length) {
    await db.insert(balances).values({ id: crypto.randomUUID(), userId, pendingBalance: '0', availableBalance: '0' });
    console.log(`✅ Balance initialized.`);
  }
}

// Usage Example:
// await seedAffiliate('affiliate@demo.co.ke', 'Jane Muthoni', '+254722222222', 'DEMO_JANE_2026');

seedAffiliate().then(() => process.exit(0));

