'use server';

import { db }          from '@/lib/utils/db';
import { products }    from '@/drizzle/schema';
import { eq, and }     from 'drizzle-orm';
import { getAuthUser } from '@/lib/healpers/auth-server';
import { vendorProfiles } from '@/drizzle/schema';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateProductSchema = z.object({
  title:                   z.string().min(3).max(200),
  shortDescription:        z.string().max(300).optional().nullable(),
  description:             z.string().optional().nullable(),
  categoryId:              z.string().uuid().optional().nullable(),
  subcategoryId:           z.string().uuid().optional().nullable(),
  sku:                     z.string().max(100).optional().nullable(),
  price:                   z.number().positive(),
  stockQuantity:           z.number().int().min(0),
  mainImageUrl:            z.string().url().optional().nullable(),
  galleryImages:           z.array(z.string().url()).optional().nullable(),
  affiliateCommissionRate: z.number().min(0).max(1),
  country:                 z.string(),
});

export async function updateProduct(productId: string, payload: unknown) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized' };
  }

  // Make sure this product belongs to this vendor
  const vendor = await db
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (!vendor.length) return { error: 'Vendor profile not found' };

  const parsed = UpdateProductSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const {
    title, shortDescription, description, categoryId, subcategoryId,
    sku, price, stockQuantity, mainImageUrl, galleryImages,
    affiliateCommissionRate, country,
  } = parsed.data;

  await db.update(products)
    .set({
      title,
      shortDescription:        shortDescription ?? null,
      description:             description      ?? null,
      categoryId:              categoryId       ?? null,
      subcategoryId:           subcategoryId    ?? null,
      sku:                     sku              ?? null,
      price:                   String(price),
      stockQuantity,
      mainImageUrl:            mainImageUrl     ?? null,
      galleryImages:           galleryImages    ?? null,
      affiliateCommissionRate: String(affiliateCommissionRate),
      country,
      status:                  'pending_approval', // re-submit for review on edit
    })
    .where(and(
      eq(products.id, productId),
      eq(products.vendorId, vendor[0].id),
    ));

  revalidatePath('/vendor/products');
  return { success: true };
}
