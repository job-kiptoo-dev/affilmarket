'use server';

import { db }             from '@/lib/utils/db';
import { users, vendorProfiles, affiliateProfiles } from '@/drizzle/schema';
import { eq }             from 'drizzle-orm';
import { getAuthUser }    from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';

export async function suspendUser(userId: string, reason?: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db.update(users)
    .set({ status: 'suspended' })
    .where(eq(users.id, userId));

  // Also suspend their profiles
  await db.update(vendorProfiles)
    .set({ status: 'suspended' })
    .where(eq(vendorProfiles.userId, userId));

  await db.update(affiliateProfiles)
    .set({ status: 'suspended' })
    .where(eq(affiliateProfiles.userId, userId));

  revalidatePath('/admin/users');
  return { success: true };
}

export async function activateUser(userId: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db.update(users)
    .set({ status: 'active' })
    .where(eq(users.id, userId));

  await db.update(vendorProfiles)
    .set({ status: 'approved' })
    .where(eq(vendorProfiles.userId, userId));

  await db.update(affiliateProfiles)
    .set({ status: 'active' })
    .where(eq(affiliateProfiles.userId, userId));

  revalidatePath('/admin/users');
  return { success: true };
}

export async function verifyUser(userId: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db.update(users)
    .set({ emailVerified: true, status: 'active' })
    .where(eq(users.id, userId));

  revalidatePath('/admin/users');
  return { success: true };
}
