import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ── Slug helper ────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix++;
  }
}

// ── Zod schema ─────────────────────────────────────────────────────────────
const CreateProductSchema = z.object({
  title:                  z.string().min(3, 'Title must be at least 3 characters').max(200),
  shortDescription:       z.string().max(300).optional().nullable(),
  description:            z.string().optional().nullable(),
  categoryId:             z.string().uuid().optional().nullable(),
  subcategoryId:          z.string().uuid().optional().nullable(),
  sku:                    z.string().max(100).optional().nullable(),
  price:                  z.number().positive('Price must be greater than 0'),
  stockQuantity:          z.number().int().min(0).default(0),
  mainImageUrl:           z.string().url().optional().nullable(),
  galleryImages:          z.array(z.string().url()).optional().nullable(),
  affiliateCommissionRate:z.number().min(0).max(1).default(0.10),
  country:                z.string().default('KE'),
});

// ── POST /api/vendor/products ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    });
    if (!vendor) {
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
      title,
      shortDescription,
      description,
      categoryId,
      subcategoryId,
      sku,
      price,
      stockQuantity,
      mainImageUrl,
      galleryImages,
      affiliateCommissionRate,
      country,
    } = parsed.data;

    const slug = await uniqueSlug(title);

    const product = await prisma.product.create({
      data: {
        vendorId:               vendor.id,
        title,
        slug,
        shortDescription:       shortDescription ?? null,
        description:            description ?? null,
        categoryId:             categoryId ?? null,
        subcategoryId:          subcategoryId ?? null,
        sku:                    sku ?? null,
        price,
        stockQuantity,
        mainImageUrl:           mainImageUrl ?? null,
        galleryImages:          galleryImages ?? null,
        affiliateCommissionRate,
        status:                 'pending_approval',   // always starts pending review
        country,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/vendor/products]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET /api/vendor/products (own products) ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || !['VENDOR', 'BOTH', 'ADMIN'].includes(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const take   = Math.min(parseInt(searchParams.get('take') ?? '50'), 100);
    const skip   = parseInt(searchParams.get('skip') ?? '0');

    const products = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        category:    { select: { name: true } },
        _count:      { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('[GET /api/vendor/products]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
