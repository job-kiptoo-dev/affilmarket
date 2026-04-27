
"use server";
import { affiliateProfiles, vendorProfiles } from "@/drizzle/schema";
import { RegisterSchema }                    from "@/lib/schemas";
import { generateAffiliateToken }            from "@/lib/utils";
import { auth }                              from "@/lib/utils/auth";
import { db }                                from "@/lib/utils/db";
import { revalidatePath }                    from "next/cache";

type ActionResult =
  | { success: true;  message: string; role: string }
  | { success: false; error: string; field?: string };

const BETTER_AUTH_ERRORS: Record<string, { field: string; message: string }> = {
  'password too long':     { field: 'password', message: 'Password is too long. Keep it under 128 characters.' },
  'password is too short': { field: 'password', message: 'Password is too short. Use at least 8 characters.' },
  'password too weak':     { field: 'password', message: 'Password is too weak. Add uppercase letters and numbers.' },
  'email already in use':  { field: 'email',    message: 'This email is already registered. Try signing in.' },
  'user already exists':   { field: 'email',    message: 'An account with this email already exists.' },
  'invalid email':         { field: 'email',    message: 'Enter a valid email address.' },
};

function isBetterAuthError(err: unknown): err is { message: string; statusCode: number; status: string } {
  // Avoid instanceof — checks duck-type instead so module mismatches don't matter
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    'status' in err &&
    'message' in err
  );
}

export async function registerUser(formData: unknown): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data. Please check your inputs." };
  }

  const { fullName, email, phone, password, role } = parsed.data;

  try {
    const result = await auth.api.signUpEmail({
      body: { name: fullName, email, password, role, phone },
    });

    const userId = result.user.id;

    // Only create profiles if user row is confirmed (no email verification pending)
    // If emailVerification.autoSignIn is false, user won't exist in users table yet
    // so we defer profile creation to a post-verification hook instead
    if (result.user.emailVerified) {
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
    }

    return {
      success: true,
      message: "Check your inbox! We've sent a verification link to activate your account.",
      role,
    };

  } catch (error: unknown) {
    console.error("REGISTRATION_FAILURE:", error);

    if (isBetterAuthError(error)) {
      const raw = (error.message ?? '').toLowerCase();
      const mapped = BETTER_AUTH_ERRORS[raw];

      return {
        success: false,
        error: mapped?.message ?? error.message ?? 'Registration failed. Please try again.',
        field: mapped?.field,
      };
    }

    // Postgres FK violation — user row not yet committed
    if (
      typeof error === 'object' &&
      error !== null &&
      'cause' in error &&
      (error as any).cause?.code === '23503'
    ) {
      return {
        success: true, // account was created — profiles will be created post-verification
        message: "Check your inbox! We've sent a verification link to activate your account.",
        role,
      };
    }

    return { success: false, error: "Something went wrong. Please try again in a few minutes." };
  }
}

// "use server";
// import { APIError }                          from "better-auth/api";
// import { affiliateProfiles, vendorProfiles } from "@/drizzle/schema";
// import { RegisterSchema }                    from "@/lib/schemas";
// import { generateAffiliateToken }            from "@/lib/utils";
// import { auth }                              from "@/lib/utils/auth";
// import { db }                                from "@/lib/utils/db";
// import { revalidatePath }                    from "next/cache";
//
// type ActionResult =
//   | { success: true;  message: string; role: string }
//   | { success: false; error: string; field?: string };
//
// const BETTER_AUTH_ERRORS: Record<string, { field: string; message: string }> = {
//   'password too long':         { field: 'password', message: 'Password is too long. Keep it under 128 characters.' },
//   'password is too short':     { field: 'password', message: 'Password is too short. Use at least 8 characters.' },
//   'password too weak':         { field: 'password', message: 'Password is too weak. Add uppercase letters and numbers.' },
//   'email already in use':      { field: 'email',    message: 'This email is already registered. Try signing in.' },
//   'user already exists':       { field: 'email',    message: 'An account with this email already exists.' },
//   'invalid email':             { field: 'email',    message: 'Enter a valid email address.' },
// };
//
// export async function registerUser(formData: unknown): Promise<ActionResult> {
//   const parsed = RegisterSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { success: false, error: "Invalid form data. Please check your inputs." };
//   }
//
//   const { fullName, email, phone, password, role } = parsed.data;
//
//   try {
//     const result = await auth.api.signUpEmail({
//       body: { name: fullName, email, password, role, phone },
//     });
//
//     const userId = result.user.id;
//
//     const sideEffects: Promise<unknown>[] = [];
//     if (role === "VENDOR" || role === "BOTH") {
//       sideEffects.push(
//         db.insert(vendorProfiles).values({
//           id:       crypto.randomUUID(),
//           userId,
//           shopName: `${fullName}'s Shop`,
//         }).onConflictDoNothing()
//       );
//     }
//     if (role === "AFFILIATE" || role === "BOTH") {
//       sideEffects.push(
//         db.insert(affiliateProfiles).values({
//           id:             crypto.randomUUID(),
//           userId,
//           fullName,
//           affiliateToken: generateAffiliateToken(),
//         }).onConflictDoNothing()
//       );
//     }
//
//     await Promise.all(sideEffects);
//     revalidatePath("/admin/users");
//
//     return {
//       success: true,
//       message: "Check your inbox! We've sent a verification link to activate your account.",
//       role,
//     };
//
//   } catch (error: unknown) {
//     console.error("REGISTRATION_FAILURE:", error);
//
//     if (error instanceof APIError) {
//       // Better Auth gives us a clean message like "Password too long"
//       const raw = error.message ?? '';
//       const mapped = BETTER_AUTH_ERRORS[raw.toLowerCase()];
//
//       return {
//         success: false,
//         error: mapped?.message ?? raw ?? 'Registration failed. Please try again.',
//         field: mapped?.field,
//       };
//     }
//
//     return { success: false, error: "Something went wrong. Please try again in a few minutes." };
//   }
//   }
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
