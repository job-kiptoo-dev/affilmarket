"use server";


  import { alias } from "drizzle-orm/pg-core";


import { db } from "@/lib/utils/db";
import {
  orders,
  users,
  vendorProfiles,
  affiliateProfiles,
  products,
  mpesaTransactions,
} from "@/drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/healpers/auth-server";

export type AdminOrderStatus =
  | "ALL" | "CREATED" | "PAID" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface AdminOrderRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  totalAmount: number;
  quantity: number;
  commissionAmount: number | null;
  platformFee: number | null;
  vendorEarning: number | null;
  shippingAddress: string | null;
  notes: string | null;
  // Customer
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  // Vendor
  vendorId: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  // Product
  productId: string;
  productName: string | null;
  productPrice: number | null;
  // Affiliate
  affiliateId: string | null;
  affiliateName: string | null;
  affiliateEmail: string | null;
  // Payment
  mpesaCode: string | null;
  mpesaPhone: string | null;
  mpesaStatus: string | null;
  mpesaCreatedAt: Date | null;
}

export interface VendorOption { id: string; name: string; }
export interface AffiliateOption { id: string; name: string; email: string; }

export interface AdminOrdersPageData {
  orders: AdminOrderRow[];
  counts: Record<string, number>;
  totalRevenue: number;
  totalCommissions: number;
  totalPlatformFees: number;
  avgOrderValue: number;
  vendors: VendorOption[];
  affiliates: AffiliateOption[];
}

export async function getAdminOrdersData(): Promise<AdminOrdersPageData> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

  const vendorUser = alias(users, "vendorUser");
  const affiliateUser = alias(users, "affiliateUser");


const rows = await db
  .select({
    id: orders.id,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
    status: orders.orderStatus,
    totalAmount: orders.totalAmount,
    quantity: orders.quantity,

    commissionAmount: orders.affiliateCommission,
    platformFee: orders.platformFee,
    vendorEarning: orders.vendorEarnings,

    shippingAddress: orders.address,
    notes: orders.notes,

    // customer
    customerId: orders.customerName,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    customerPhone: orders.customerPhone,

    // vendor
    vendorId: orders.vendorId,
    vendorName: vendorProfiles.shopName,
    vendorPhone: vendorProfiles.phone,
    vendorEmail: vendorUser.email,

    // product
    productId: orders.productId,
    productName: products.title,
    productPrice: products.price,

    // affiliate
    affiliateId: orders.affiliateId,
    affiliateName: affiliateProfiles.fullName,
    affiliateEmail: affiliateUser.email,

    // mpesa
    mpesaCode: mpesaTransactions.mpesaReceiptNumber,
    mpesaPhone: mpesaTransactions.phoneNumber,
    mpesaStatus: mpesaTransactions.status,
    mpesaCreatedAt: mpesaTransactions.createdAt,
  })
  .from(orders)

  // joins
  .leftJoin(products, eq(orders.productId, products.id))

  .leftJoin(vendorProfiles, eq(orders.vendorId, vendorProfiles.id))
  .leftJoin(vendorUser, eq(vendorProfiles.userId, vendorUser.id))

  .leftJoin(affiliateProfiles, eq(orders.affiliateId, affiliateProfiles.id))
  .leftJoin(affiliateUser, eq(affiliateProfiles.userId, affiliateUser.id))

  .leftJoin(mpesaTransactions, eq(mpesaTransactions.orderId, orders.id))

  .orderBy(desc(orders.createdAt))
  .limit(500);

const counts: Record<string, number> = { ALL: rows.length };
for (const r of rows) {
  counts[r.status] = (counts[r.status] ?? 0) + 1;
}

const nonCancelled = rows.filter((o) => o.status !== "CANCELLED");

const totalRevenue = nonCancelled.reduce(
  (s, o) => s + Number(o.totalAmount ?? 0),
  0
);

const totalCommissions = nonCancelled.reduce(
  (s, o) => s + Number(o.commissionAmount ?? 0),
  0
);

const totalPlatformFees = nonCancelled.reduce(
  (s, o) => s + Number(o.platformFee ?? 0),
  0
);

const avgOrderValue =
  nonCancelled.length > 0
    ? totalRevenue / nonCancelled.length
    : 0;

const vendorRows = await db
  .select({
    id: vendorProfiles.id,
    name: vendorProfiles.shopName,
  })
  .from(vendorProfiles);

const vendors: VendorOption[] = vendorRows.map((v) => ({
  id: v.id,
  name: v.name ?? v.id,
}));

const affiliateRows = await db
  .select({
    id: affiliateProfiles.id,
    name: affiliateProfiles.fullName,
    email: users.email,
  })
  .from(affiliateProfiles)
  .leftJoin(users, eq(affiliateProfiles.userId, users.id));

const affiliates: AffiliateOption[] = affiliateRows.map((a) => ({
  id: a.id,
  name: a.name ?? a.id,
  email: a.email ?? "",
}));


return {
  orders: rows.map((r) => ({
    ...r,
    totalAmount: Number(r.totalAmount),
    productPrice: r.productPrice ? Number(r.productPrice) : null,
    commissionAmount: r.commissionAmount ? Number(r.commissionAmount) : null,
    platformFee: r.platformFee ? Number(r.platformFee) : null,
    vendorEarning: r.vendorEarning ? Number(r.vendorEarning) : null,
  })) as AdminOrderRow[],
  counts,
  totalRevenue,
  totalCommissions,
  totalPlatformFees,
  avgOrderValue,
  vendors,
  affiliates,
};
}

export async function adminCancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return { success: false, error: "Unauthorized" };
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { success: false, error: "Order not found" };
  if (["DELIVERED", "CANCELLED"].includes(order.orderStatus))
    return { success: false, error: `Cannot cancel a ${order.orderStatus} order` };
  await db.update(orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminForceDeliver(orderId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return { success: false, error: "Unauthorized" };
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { success: false, error: "Order not found" };
  if (order.orderStatus === "DELIVERED") return { success: false, error: "Already delivered" };
  if (order.orderStatus === "CANCELLED") return { success: false, error: "Order is cancelled" };
  await db.update(orders).set({ orderStatus: "DELIVERED", updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminAssignAffiliate(
  orderId: string,
  affiliateId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return { success: false, error: "Unauthorized" };
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { success: false, error: "Order not found" };
  await db.update(orders).set({ affiliateId: affiliateId ?? null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminUpdateNotes(
  orderId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return { success: false, error: "Unauthorized" };
  await db.update(orders).set({ notes, updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  return { success: true };
}
