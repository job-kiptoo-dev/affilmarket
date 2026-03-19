'use server';

import { db }          from '@/lib/utils/db';
import { products }    from '@/drizzle/schema';
import { eq }          from 'drizzle-orm';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';

export async function reviewProduct(productId: string, action: 'approve' | 'reject', adminNote?: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db.update(products)
    .set({
      status:    action === 'approve' ? 'active' : 'rejected',
      adminNote: adminNote ?? null,
    })
    .where(eq(products.id, productId));

  revalidatePath('/admin/products');
  return { success: true };
}
