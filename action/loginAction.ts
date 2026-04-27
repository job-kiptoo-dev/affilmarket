

"use server";
import { users }       from "@/drizzle/schema";
import { LoginSchema } from "@/lib/schemas";
import { auth }        from "@/lib/utils/auth";
import { db }          from "@/lib/utils/db";
import { eq }          from "drizzle-orm";

type LoginResult =
  | { success: true;  role: string }
  | { success: false; error: string; field?: string; code?: string };

function isBetterAuthError(err: unknown): err is { message: string; statusCode: number } {
  return (
    typeof err === 'object' && err !== null &&
    'statusCode' in err && 'message' in err
  );
}

export async function loginUser(formData: unknown): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data. Please check your inputs." };
  }

  const { email, password } = parsed.data;

  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
    });

    if (!result?.user) {
      return { success: false, error: "Invalid email or password.", field: "email" };
    }

    // Role is already on the session user — no extra DB query needed
    const role = (result.user as any).role as string;
    return { success: true, role };

  } catch (error: unknown) {
    console.error("LOGIN_FAILURE:", error);

    if (isBetterAuthError(error)) {
      const raw = (error.message ?? '').toLowerCase();

      if (error.statusCode === 403 || raw.includes('email not verified')) {
        return {
          success: false,
          error: "Please verify your email before signing in. Check your inbox.",
          code:  "EMAIL_NOT_VERIFIED",
        };
      }

      if (raw.includes('invalid credentials') || raw.includes('invalid email or password')) {
        return {
          success: false,
          error: "Incorrect email or password.",
          field: "email",
        };
      }

      if (raw.includes('too many') || error.statusCode === 429) {
        return {
          success: false,
          error: "Too many attempts. Please wait a few minutes and try again.",
        };
      }

      // Return Better Auth's message directly if it's user-facing enough
      return { success: false, error: error.message ?? "Login failed. Please try again." };
    }

    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// "use server"
//
// import { users } from "@/drizzle/schema";
// import { LoginSchema } from "@/lib/schemas";
// import { auth } from "@/lib/utils/auth";
// import { db } from "@/lib/utils/db";
// import { eq } from "drizzle-orm";
//
// export async function loginUser(formData: unknown) {
//   const parsed = LoginSchema.safeParse(formData);
//   if (!parsed.success) {
//     return { error: parsed.error.message };
//   }
//
//   const { email, password } = parsed.data;
//
//   const result = await auth.api.signInEmail({
//     body: { email, password },
//   });
//
//   if (!result?.user) {
//     return { error: 'Invalid email or password' };
//   }
//
//   const dbUser = await db
//     .select({ role: users.role })
//     .from(users)
//     .where(eq(users.email, email))
//     .limit(1);
//
//   if (!dbUser.length) {
//     return { error: 'User not found' };
//   }
//
//   return { success: true, role: dbUser[0].role };
// }
