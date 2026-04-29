'use server';

import { db }             from '@/lib/utils/db';
import { products }       from '@/drizzle/schema';
import { eq, and }        from 'drizzle-orm';
import { getAuthUser }    from '@/lib/healpers/auth-server';
import { revalidatePath } from 'next/cache';

// ── Review product (approve / reject) ──────────────────
export async function reviewProduct(
  productId: string,
  action:    'approve' | 'reject',
  adminNote?: string,
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  const [product] = await db
    .select({ stockQuantity: products.stockQuantity })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  // ── If approving but stock is 0 → set inactive not active ──
  const newStatus = action === 'reject'
    ? 'rejected'
    : product?.stockQuantity === 0
      ? 'inactive'   // ← can't sell what you don't have
      : 'active';

  const newNote = action === 'reject'
    ? (adminNote ?? null)
    : product?.stockQuantity === 0
      ? 'Auto-set to inactive: product has 0 stock. Add stock to activate.'
      : (adminNote ?? null);

  await db
    .update(products)
    .set({
      status:    newStatus,
      adminNote: newNote,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath('/admin/products');
  return { success: true };
}

// ── Deactivate a product manually ──────────────────────
export async function deactivateProduct(
  productId: string,
  adminNote?: string,
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db
    .update(products)
    .set({
      status:    'inactive',
      adminNote: adminNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath('/admin/products');
  return { success: true };
}

// ── Auto-deactivate all out of stock active products ───
export async function deactivateOutOfStockProducts() {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  await db
    .update(products)
    .set({
      status:    'inactive',
      adminNote: 'Auto-deactivated: out of stock',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.stockQuantity, 0),
        eq(products.status,        'active'),
      )
    );

  revalidatePath('/admin/products');
  return { success: true };
}

// ── Reactivate a product (vendor added stock) ──────────
export async function reactivateProduct(productId: string) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'ADMIN') return { error: 'Unauthorized' };

  const [product] = await db
    .select({ stockQuantity: products.stockQuantity })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return { error: 'Product not found' };

  // ── Can't reactivate if still out of stock ──
  if (product.stockQuantity === 0) {
    return { error: 'Cannot reactivate — product still has 0 stock. Add stock first.' };
  }

  await db
    .update(products)
    .set({
      status:    'active',
      adminNote: null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  revalidatePath('/admin/products');
  return { success: true };
}
