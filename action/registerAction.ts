'use server';

import { db } from '@/lib/utils/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { RegisterSchema } from '@/lib/schemas';
import { generateAffiliateToken } from '@/lib/utils';
import { affiliateProfiles, vendorProfiles } from '@/drizzle/schema';
import { auth } from '@/lib/utils/auth';


export async function registerUser(formData: unknown) {
  const parsed = RegisterSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  const { fullName, email, phone, password, role } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: 'Email already in use' };
  }


// Narrow the optional fields after successful parse
if (!fullName) return { error: 'Full name is required' };


  const result = await auth.api.signUpEmail({
    body: {
      name: fullName,
      email,
      role,
      password,
    },
  });

  if (!result?.user) {
    return { error: 'Failed to create account' };
  }

  const userId = result.user.id;

  // Save role (and phone) — Better Auth doesn't store these automatically
  await db
    .update(users)
    .set({ role, phone })
    .where(eq(users.id, userId));

  if (role === 'VENDOR' || role === 'BOTH') {
    await db.insert(vendorProfiles).values({
      id: crypto.randomUUID(),
      userId,
      shopName: fullName,
    });
  }

  if (role === 'AFFILIATE' || role === 'BOTH') {
    await db.insert(affiliateProfiles).values({
      id: crypto.randomUUID(),
      userId,
      fullName,
      affiliateToken: generateAffiliateToken(),
    });
  }

  return { success: true, role };
}
// export async function registerUser(formData: unknown) {
//   const parsed = RegisterSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.errors[0].message };
//   }
//
//   const { fullName, email, phone, password, role } = parsed.data;
//
//   // Check email taken
//   const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
//   if (existing.length > 0) {
//     return { error: 'Email already in use' };
//   }
//
//   // Create user via better-auth
//   const result = await auth.api.signUpEmail({
//     body: { name: fullName, email, password,role,phone },
//   });
//
//   if (!result?.user) {
//     return { error: 'Failed to create account' };
//   }
//
//   const userId = result.user.id;
//
//   // Update role + phone (better-auth only sets name/email/password)
//   await db.update(users)
//     .set({ role, phone: phone ?? null })
//     .where(eq(users.id, userId));
//
//   // Create profile(s)
//   if (role === 'VENDOR' || role === 'BOTH') {
//     await db.insert(vendorProfiles).values({
//       userId,
//       shopName: fullName,
//     });
//   }
//
//   if (role === 'AFFILIATE' || role === 'BOTH') {
//     await db.insert(affiliateProfiles).values({
//       userId,
//       fullName,
//       affiliateToken: generateAffiliateToken(),
//     });
//   }
//
//   return { success: true, role };
// }
