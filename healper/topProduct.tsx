// Add to the Promise.all in getAffiliateData:
const topProducts = await db
  .select({
    productId:    affiliateClicks.productId,
    productTitle: products.title,
    productSlug:  products.slug,
    productImage: products.mainImageUrl,
    clicks:       sql<number>`count(*)::int`,
    price:        products.price,
    commRate:     products.affiliateCommissionRate,
  })
  .from(affiliateClicks)
  .leftJoin(products, eq(affiliateClicks.productId, products.id))
  .where(eq(affiliateClicks.affiliateId, aff.id))
  .groupBy(
    affiliateClicks.productId,
    products.title,
    products.slug,
    products.mainImageUrl,
    products.price,
    products.affiliateCommissionRate,
  )
  .orderBy(sql`count(*) desc`)
  .limit(5);
