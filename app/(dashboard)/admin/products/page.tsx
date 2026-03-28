export const dynamic = "force-dynamic";

import { db }            from "@/lib/utils/db";
import { products, vendorProfiles, categories } from "@/drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect }      from "next/navigation";
import { formatKES }     from "@/lib/utils";
import { getAuthUser }   from "@/lib/healpers/auth-server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductReviewButtons } from "@/components/admin/ProductReviewButtons";
import { Package, Store, Tag, ImageOff } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending_approval: { label: "Pending Review",  bg: "bg-blue-50",   text: "text-blue-700",  border: "border-blue-200"  },
  active:           { label: "Active",           bg: "bg-green-50",  text: "text-green-700", border: "border-green-200" },
  rejected:         { label: "Rejected",         bg: "bg-red-50",    text: "text-red-700",   border: "border-red-200"   },
  draft:            { label: "Draft",            bg: "bg-gray-50",   text: "text-gray-600",  border: "border-gray-200"  },
  inactive:         { label: "Inactive",         bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200" },
} as const;

type ProductStatus = keyof typeof STATUS_CONFIG;

const VALID_STATUSES = Object.keys(STATUS_CONFIG) as ProductStatus[];

// ── Data fetcher ──────────────────────────────────────────────────────────────
async function getProducts(status: ProductStatus) {
  return db
    .select({
      id:                     products.id,
      title:                  products.title,
      slug:                   products.slug,
      price:                  products.price,
      shortDescription:       products.shortDescription,
      mainImageUrl:           products.mainImageUrl,
      stockQuantity:          products.stockQuantity,
      country:                products.country,
      status:                 products.status,
      adminNote:              products.adminNote,
      createdAt:              products.createdAt,
      affiliateCommissionRate: products.affiliateCommissionRate,
      shopName:               vendorProfiles.shopName,
      categoryName:           categories.name,
      orderCount:             sql<number>`count(distinct orders.id)::int`,
    })
    .from(products)
    .leftJoin(vendorProfiles, eq(products.vendorId, vendorProfiles.id))
    .leftJoin(categories,     eq(products.categoryId, categories.id))
    .leftJoin(
      sql`orders`,
      sql`orders.product_id = ${products.id}`,
    )
    .where(eq(products.status, status))
    .groupBy(
      products.id,
      vendorProfiles.shopName,
      categories.name,
    )
    .orderBy(desc(products.createdAt));
}

async function getStatusCounts() {
  const rows = await db
    .select({
      status: products.status,
      count:  sql<number>`count(*)::int`,
    })
    .from(products)
    .groupBy(products.status);

  return Object.fromEntries(rows.map((r) => [r.status, r.count])) as
    Partial<Record<ProductStatus, number>>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== "ADMIN") redirect("/login");

  const { status: rawStatus } = await searchParams;
  const status: ProductStatus =
    VALID_STATUSES.includes(rawStatus as ProductStatus)
      ? (rawStatus as ProductStatus)
      : "pending_approval";

  const [rows, counts] = await Promise.all([
    getProducts(status),
    getStatusCounts(),
  ]);

  const cfg = STATUS_CONFIG[status];

  return (
    <DashboardShell role="ADMIN" vendorName={auth.name}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">Review, approve and manage marketplace products</p>
        </div>

        {/* ── Status tabs ── */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
          {VALID_STATUSES.map((s) => {
            const c     = STATUS_CONFIG[s];
            const count = counts[s] ?? 0;
            const active = s === status;
            return (
              <a
                key={s}
                href={`/admin/products?status=${s}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  active
                    ? `${c.bg} ${c.text} ${c.border}`
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {c.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    active ? `${c.bg} ${c.text}` : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* ── Empty state ── */}
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">No {cfg.label.toLowerCase()} products</p>
            <p className="text-gray-400 text-sm mt-1">They'll appear here when vendors submit them</p>
          </div>
        )}

        {/* ── Product cards ── */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((product) => {
              const price    = parseFloat(product.price);
              const commRate = parseFloat(product.affiliateCommissionRate);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col"
                >
                  {/* Image */}
                  <div className="aspect-video bg-gray-50 relative overflow-hidden">
                    {product.mainImageUrl
                      ? (
                        <img
                          src={product.mainImageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-10 h-10 text-gray-200" />
                        </div>
                      )}

                    {/* Status badge */}
                    <div className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </div>

                    {/* Country badge */}
                    <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-lg bg-black/60 text-white">
                      {product.country}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col gap-3 flex-1">

                    {/* Title + meta */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                        {product.title}
                      </h3>
                      {product.shortDescription && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {product.shortDescription}
                        </p>
                      )}
                    </div>

                    {/* Vendor + category */}
                    <div className="flex flex-wrap gap-2">
                      {product.shopName && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                          <Store size={11} /> {product.shopName}
                        </span>
                      )}
                      {product.categoryName && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                          <Tag size={11} /> {product.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Price / commission / stock */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                        <div className="text-xs font-bold text-gray-900 leading-tight">
                          {formatKES(price)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Price</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-2.5 text-center border border-green-100">
                        <div className="text-xs font-bold text-green-700 leading-tight">
                          {(commRate * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-green-600 mt-0.5 uppercase tracking-wide">Commission</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                        <div className="text-xs font-bold text-gray-900 leading-tight">
                          {product.stockQuantity}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">Stock</div>
                      </div>
                    </div>

                    {/* Submitted date */}
                    <p className="text-[11px] text-gray-400">
                      Submitted {new Date(product.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>

                    {/* Existing admin note */}
                    {product.adminNote && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                        <span className="font-bold">Admin note:</span> {product.adminNote}
                      </div>
                    )}

                    {/* View product link */}
                    <a
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline self-start"
                    >
                      Preview product →
                    </a>

                    {/* Approve / Reject — only shown for pending */}
                    {status === "pending_approval" && (
                      <div className="mt-auto pt-2 border-t border-gray-50">
                        <ProductReviewButtons
                          productId={product.id}
                          productTitle={product.title}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
