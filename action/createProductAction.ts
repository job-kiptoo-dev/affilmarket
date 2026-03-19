'use server';

import { db }           from '@/lib/utils/db';
import { products }     from '@/drizzle/schema';
import { vendorProfiles } from '@/drizzle/schema';
import { eq }           from 'drizzle-orm';
import { getAuthUser }  from '@/lib/healpers/auth-server';
import { generateUniqueSlug } from '@/lib/server-utils';
import { z }            from 'zod';

const CreateProductSchema = z.object({
  title:                   z.string().min(3).max(200),
  shortDescription:        z.string().max(300).optional().nullable(),
  description:             z.string().optional().nullable(),
  categoryId:              z.string().uuid().optional().nullable(),
  subcategoryId:           z.string().uuid().optional().nullable(),
  sku:                     z.string().max(100).optional().nullable(),
  price:                   z.number().positive(),
  stockQuantity:           z.number().int().min(0).default(0),
  mainImageUrl:            z.string().url().optional().nullable(),
  galleryImages:           z.array(z.string().url()).optional().nullable(),
  affiliateCommissionRate: z.number().min(0).max(1).default(0.10),
  country:                 z.string().default('KE'),
});

export async function createProduct(payload: unknown) {
  const auth = await getAuthUser();
  if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
    return { error: 'Unauthorized', status: 401 };
  }

  const vendor = await db
    .select({ id: vendorProfiles.id })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, auth.sub))
    .limit(1);

  if (!vendor.length) {
    return { error: 'Vendor profile not found', status: 404 };
  }

  const parsed = CreateProductSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: 'Validation failed',
      issues: parsed.error.flatten().fieldErrors,
      status: 422,
    };
  }

  const {
    title, shortDescription, description, categoryId, subcategoryId,
    sku, price, stockQuantity, mainImageUrl, galleryImages,
    affiliateCommissionRate, country,
  } = parsed.data;

  const slug = await generateUniqueSlug(title, 'product');
  //
  // const [product] = await db.insert(products).values({
  //   vendorId:               vendor[0].id,
  //   title,
  //   slug,
  //   shortDescription:       shortDescription ?? null,
  //   description:            description      ?? null,
  //   categoryId:             categoryId       ?? null,
  //   subcategoryId:          subcategoryId    ?? null,
  //   sku:                    sku              ?? null,
  //   price:                  String(price),
  //   stockQuantity,
  //   mainImageUrl:           mainImageUrl     ?? null,
  //   galleryImages:          galleryImages    ?? null,
  //   affiliateCommissionRate: String(affiliateCommissionRate),
  //   status:                 'pending_approval',
  //   country,
  // }).returning();

  const [product] = await db.insert(products).values({
  id:                      crypto.randomUUID(), // ← add this
  vendorId:                vendor[0].id,
  title,
  slug,
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
  status:                  'pending_approval',
  country,
}).returning();

  return { success: true, product };
}
