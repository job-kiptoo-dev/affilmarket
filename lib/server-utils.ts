import 'server-only';
// import { db } from '@/lib/db';
import { products, categories } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { generateSlug } from '@/lib/utils';
import { db } from './utils/db';

export async function generateUniqueSlug(title: string, model: 'product' | 'category'): Promise<string> {
  const base = generateSlug(title);
  let slug = base;
  let counter = 1;

  while (true) {
    const exists =
      model === 'product'
        ? await db.select().from(products).where(eq(products.slug, slug)).limit(1)
        : await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

    if (exists.length === 0) return slug;
    slug = `${base}-${counter++}`;
  }
}
