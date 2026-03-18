import { NextRequest, NextResponse } from 'next/server';
// import { getAuthUser } from '@/lib/auth-server';
import { db } from '@/lib/utils/db';
import { products as productsTable, vendorProfiles, categories } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateUniqueSlug } from '@/lib/server-utils';
import { getAuthUser } from '@/lib/healpers/auth-server';

// ── Zod schema ─────────────────────────────────────────────────────────────
const CreateProductSchema = z.object({
  title:                   z.string().min(3, 'Title must be at least 3 characters').max(200),
  shortDescription:        z.string().max(300).optional().nullable(),
  description:             z.string().optional().nullable(),
  categoryId:              z.string().uuid().optional().nullable(),
  subcategoryId:           z.string().uuid().optional().nullable(),
  sku:                     z.string().max(100).optional().nullable(),
  price:                   z.number().positive('Price must be greater than 0'),
  stockQuantity:           z.number().int().min(0).default(0),
  mainImageUrl:            z.string().url().optional().nullable(),
  galleryImages:           z.array(z.string().url()).optional().nullable(),
  affiliateCommissionRate: z.number().min(0).max(1).default(0.10),
  country:                 z.string().default('KE'),
});

// ── POST /api/vendor/products ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await db
      .select({ id: vendorProfiles.id })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, auth.sub))
      .limit(1);

    if (!vendor.length) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = CreateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const {
      title, shortDescription, description, categoryId, subcategoryId,
      sku, price, stockQuantity, mainImageUrl, galleryImages,
      affiliateCommissionRate, country,
    } = parsed.data;

    const slug = await generateUniqueSlug(title, 'product');

    const [product] = await db.insert(productsTable).values({
      vendorId:               vendor[0].id,
      title,
      slug,
      shortDescription:       shortDescription ?? null,
      description:            description ?? null,
      categoryId:             categoryId ?? null,
      subcategoryId:          subcategoryId ?? null,
      sku:                    sku ?? null,
      price:                  String(price),
      stockQuantity,
      mainImageUrl:           mainImageUrl ?? null,
      galleryImages:          galleryImages ?? null,
      affiliateCommissionRate: String(affiliateCommissionRate),
      status:                 'pending_approval',
      country,
    }).returning();

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/vendor/products]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET /api/vendor/products ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await db
      .select({ id: vendorProfiles.id })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, auth.sub))
      .limit(1);

    if (!vendor.length) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const take   = Math.min(parseInt(searchParams.get('take') ?? '50'), 100);
    const skip   = parseInt(searchParams.get('skip') ?? '0');

    const conditions = [eq(productsTable.vendorId, vendor[0].id)];
    if (status) conditions.push(eq(productsTable.status, status as any));

    const products = await db
      .select({
        id:                     productsTable.id,
        title:                  productsTable.title,
        slug:                   productsTable.slug,
        price:                  productsTable.price,
        status:                 productsTable.status,
        stockQuantity:          productsTable.stockQuantity,
        mainImageUrl:           productsTable.mainImageUrl,
        affiliateCommissionRate: productsTable.affiliateCommissionRate,
        createdAt:              productsTable.createdAt,
        category: {
          name: categories.name,
        },
      })
      .from(productsTable)
      .leftJoin(categories, eq(productsTable.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(productsTable.createdAt)
      .limit(take)
      .offset(skip);

    return NextResponse.json({ products });
  } catch (err) {
    console.error('[GET /api/vendor/products]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
