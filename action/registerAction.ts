"use server";

import { affiliateProfiles, vendorProfiles } from "@/drizzle/schema";
import { RegisterSchema }                    from "@/lib/schemas";
import { generateAffiliateToken }            from "@/lib/utils";
import { auth }                              from "@/lib/utils/auth";
import { db }                                from "@/lib/utils/db";
import { revalidatePath }                    from "next/cache";

type ActionResult =
  | { success: true;  message: string; role: string }
  | { success: false; error: string };

export async function registerUser(formData: unknown): Promise<ActionResult> {
  // 1. Validate input
  const parsed = RegisterSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data. Please check your inputs." };
  }

  const { fullName, email, phone, password, role } = parsed.data;

  try {
    // 2. Create account via Better Auth
    const result = await auth.api.signUpEmail({
      body: { name: fullName, email, password, role, phone },
    });

    const userId = result.user.id;

    // 3. Create role-specific profiles in parallel
    const sideEffects: Promise<unknown>[] = [];

    if (role === "VENDOR" || role === "BOTH") {
      sideEffects.push(
        db.insert(vendorProfiles).values({
          id:       crypto.randomUUID(),
          userId,
          shopName: `${fullName}'s Shop`,
        }).onConflictDoNothing()
      );
    }

    if (role === "AFFILIATE" || role === "BOTH") {
      sideEffects.push(
        db.insert(affiliateProfiles).values({
          id:             crypto.randomUUID(),
          userId,
          fullName,
          affiliateToken: generateAffiliateToken(),
        }).onConflictDoNothing()
      );
    }

    await Promise.all(sideEffects);
    revalidatePath("/admin/users");

    return {
      success: true,
      message: "Check your inbox! We've sent a verification link to activate your account.",
      role,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    console.error("REGISTRATION_FAILURE:", error);

    if (message.includes("already exists")) {
      return { success: false, error: "This email is already registered. Try signing in instead." };
    }

    return { success: false, error: "Something went wrong. Please try again in a few minutes." };
  }
}

// 'use server';
//
// import { db } from '@/lib/utils/db';
// import { users } from '@/drizzle/schema';
// import { eq } from 'drizzle-orm';
// import { RegisterSchema } from '@/lib/schemas';
// import { generateAffiliateToken } from '@/lib/utils';
// import { affiliateProfiles, vendorProfiles } from '@/drizzle/schema';
// import { auth } from '@/lib/utils/auth';
//
//
// export async function registerUser(formData: unknown) {
//   const parsed = RegisterSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.message };
//   }
//
//   const { fullName, email, phone, password, role } = parsed.data;
//
//   const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
//   if (existing.length > 0) {
//     return { error: 'Email already in use' };
//   }
//
//
// // Narrow the optional fields after successful parse
// if (!fullName) return { error: 'Full name is required' };
//
//
//   const result = await auth.api.signUpEmail({
//     body: {
//       name: fullName,
//       email,
//       role,
//       password,
//
//     },
//   });
//
//   if (!result?.user) {
//     return { error: 'Failed to create account' };
//   }
//
//   const userId = result.user.id;
//
//   // Save role (and phone) — Better Auth doesn't store these automatically
//   await db
//     .update(users)
//     .set({ role, phone })
//     .where(eq(users.id, userId));
//
//   if (role === 'VENDOR' || role === 'BOTH') {
//     await db.insert(vendorProfiles).values({
//       id: crypto.randomUUID(),
//       userId,
//       shopName: fullName,
//     });
//   }
//
//   if (role === 'AFFILIATE' || role === 'BOTH') {
//     await db.insert(affiliateProfiles).values({
//       id: crypto.randomUUID(),
//       userId,
//       fullName,
//       affiliateToken: generateAffiliateToken(),
//     });
//   }
//
//   return { success: true,
// message: "Verification email sent! Please check your inbox.",
//     role };
// }
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
