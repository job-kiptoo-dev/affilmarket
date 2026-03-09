import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paginationMeta } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(48, parseInt(searchParams.get('limit') || '12'));
  const skip = (page - 1) * limit;

  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const sort = searchParams.get('sort') || 'newest';

  // Build where clause
  const where: any = { status: 'active' };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { shortDescription: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  if (subcategory) {
    where.subcategory = { slug: subcategory };
  }

  if (priceMin || priceMax) {
    where.price = {};
    if (priceMin) where.price.gte = parseFloat(priceMin);
    if (priceMax) where.price.lte = parseFloat(priceMax);
  }

  // Sort
  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'popular') orderBy = { orders: { _count: 'desc' } };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        vendor: { select: { shopName: true, shopAddress: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: paginationMeta(total, page, limit),
  });
}
