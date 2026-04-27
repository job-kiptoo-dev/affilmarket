import 'dotenv/config';
import { db } from '@/lib/utils/db';
import { auth } from '@/lib/utils/auth';
import { users, balances } from '@/drizzle/schema';
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
