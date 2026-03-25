"use server"

import { users } from "@/drizzle/schema";
import { LoginSchema } from "@/lib/schemas";
import { auth } from "@/lib/utils/auth";
import { db } from "@/lib/utils/db";
import { eq } from "drizzle-orm";

export async function loginUser(formData: unknown) {
  const parsed = LoginSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.message };
  }

  const { email, password } = parsed.data;

  const result = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!result?.user) {
    return { error: 'Invalid email or password' };
  }

  const dbUser = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!dbUser.length) {
    return { error: 'User not found' };
  }

  return { success: true, role: dbUser[0].role };
}
