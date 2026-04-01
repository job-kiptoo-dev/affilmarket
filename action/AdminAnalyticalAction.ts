"use server";

import { db } from "@/lib/utils/db";
import {
  orders,
  users,
  vendorProfiles,
  affiliateProfiles,
  products,
  mpesaTransactions,
  payoutRequests,
} from "@/drizzle/schema";
import { eq, gte, lte, and, count, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/healpers/auth-server";

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "12m";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  commissions: number;
  platformFees: number;
}
export interface OrderFunnel { status: string; count: number; value: number; }
export interface TopVendor { vendorId: string; shopName: string; totalRevenue: number; totalOrders: number; avgOrderValue: number; delivered: number; }
export interface TopAffiliate { affiliateId: string; fullName: string; email: string; totalCommissions: number; totalOrders: number; conversionOrders: number; }
export interface TopProduct { productId: string; productTitle: string; vendorShopName: string; totalRevenue: number; totalUnits: number; totalOrders: number; }
export interface UserGrowth { date: string; vendors: number; affiliates: number; }
export interface MpesaStats {
  total: number;
  // ✅ mpesaStatusEnum: PENDING | SUCCESS | FAILED | TIMEOUT (no PAID)
  success: number;
  failed: number;
  timeout: number;
  pending: number;
  successRate: number;
  totalVolume: number;
  avgAmount: number;
}
export interface PayoutSummary {
  pendingCount: number; pendingAmount: number;
  approvedCount: number; approvedAmount: number;
  paidCount: number; paidAmount: number;
  rejectedCount: number;
  vendorPending: number; affiliatePending: number;
}
export interface HourOfDayBucket { hour: number; orders: number; revenue: number; }
export interface DayOfWeekBucket { day: number; label: string; orders: number; revenue: number; }
export interface CustomerRepeatStats { firstTime: number; repeat: number; repeatRate: number; }

export interface AnalyticsData {
  period: AnalyticsPeriod;
  totalRevenue: number; prevRevenue: number;
  totalOrders: number; prevOrders: number;
  totalCommissions: number; prevCommissions: number;
  platformFees: number; prevPlatformFees: number;
  avgOrderValue: number; prevAvgOrderValue: number;
  deliveryRate: number; cancellationRate: number;
  dailyRevenue: DailyRevenue[];
  orderFunnel: OrderFunnel[];
  topVendors: TopVendor[];
  topAffiliates: TopAffiliate[];
  topProducts: TopProduct[];
  userGrowth: UserGrowth[];
  mpesa: MpesaStats;
  payouts: PayoutSummary;
  hourOfDay: HourOfDayBucket[];
  dayOfWeek: DayOfWeekBucket[];
  customerRepeat: CustomerRepeatStats;
  totalUsers: number; totalVendors: number; totalAffiliates: number; totalProducts: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodToDays(p: AnalyticsPeriod) { return { "7d": 7, "30d": 30, "90d": 90, "12m": 365 }[p]; }
const toNum = (s: string | null | undefined) => parseFloat(s ?? "0") || 0;

// ── Main ──────────────────────────────────────────────────────────────────────

export async function getAnalyticsData(period: AnalyticsPeriod = "30d"): Promise<AnalyticsData> {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

  const days = periodToDays(period);
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(periodStart.getTime() - days * 86400000);

  // ── Orders ────────────────────────────────────────────────────────────────
  const curOrders = await db.select().from(orders).where(gte(orders.createdAt, periodStart));
  const prevOrderRows = await db.select().from(orders).where(and(gte(orders.createdAt, prevStart), lte(orders.createdAt, periodStart)));

  const calcMetrics = (rows: typeof curOrders) => {
    // ✅ filter by orderStatus (not status)
    const active = rows.filter((o) => o.orderStatus !== "CANCELLED");
    const revenue = active.reduce((s, o) => s + toNum(o.totalAmount), 0);
    // ✅ affiliateCommission (not commissionAmount)
    const commissions = active.reduce((s, o) => s + toNum(o.affiliateCommission), 0);
    const fees = active.reduce((s, o) => s + toNum(o.platformFee), 0);
    return { revenue, commissions, fees, avg: active.length ? revenue / active.length : 0, count: rows.length };
  };

  const cur = calcMetrics(curOrders);
  const prev = calcMetrics(prevOrderRows);

  // ✅ orderStatus not status
  const delivered = curOrders.filter((o) => o.orderStatus === "DELIVERED").length;
  const cancelled = curOrders.filter((o) => o.orderStatus === "CANCELLED").length;
  const deliveryRate = curOrders.length ? (delivered / curOrders.length) * 100 : 0;
  const cancellationRate = curOrders.length ? (cancelled / curOrders.length) * 100 : 0;

  // ── Daily revenue buckets ─────────────────────────────────────────────────
  const bucketCount = Math.min(days, 90);
  const buckets: Record<string, DailyRevenue> = {};
  for (let i = 0; i < bucketCount; i++) {
    const d = new Date(periodStart.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, revenue: 0, orders: 0, commissions: 0, platformFees: 0 };
  }
  for (const o of curOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (buckets[key] && o.orderStatus !== "CANCELLED") {
      buckets[key].revenue += toNum(o.totalAmount);
      buckets[key].orders += 1;
      buckets[key].commissions += toNum(o.affiliateCommission);
      buckets[key].platformFees += toNum(o.platformFee);
    }
  }
  let dailyRevenue: DailyRevenue[];
  if (period === "12m") {
    const monthly: Record<string, DailyRevenue> = {};
    for (const v of Object.values(buckets)) {
      const month = v.date.slice(0, 7);
      if (!monthly[month]) monthly[month] = { date: month, revenue: 0, orders: 0, commissions: 0, platformFees: 0 };
      monthly[month].revenue += v.revenue;
      monthly[month].orders += v.orders;
      monthly[month].commissions += v.commissions;
      monthly[month].platformFees += v.platformFees;
    }
    dailyRevenue = Object.values(monthly).sort((a, b) => a.date.localeCompare(b.date));
  } else {
    dailyRevenue = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Order funnel ──────────────────────────────────────────────────────────
  const funnelStatuses = ["CREATED", "PAID", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
  const orderFunnel: OrderFunnel[] = funnelStatuses.map((status) => {
    const m = curOrders.filter((o) => o.orderStatus === status);
    return { status, count: m.length, value: m.reduce((s, o) => s + toNum(o.totalAmount), 0) };
  });

  // ── Hour of day (EAT = UTC+3) ─────────────────────────────────────────────
  const hourBuckets: HourOfDayBucket[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
  for (const o of curOrders) {
    if (o.orderStatus === "CANCELLED") continue;
    const hour = (new Date(o.createdAt).getUTCHours() + 3) % 24;
    hourBuckets[hour].orders += 1;
    hourBuckets[hour].revenue += toNum(o.totalAmount);
  }

  // ── Day of week (EAT) ─────────────────────────────────────────────────────
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowBuckets: DayOfWeekBucket[] = DOW.map((label, day) => ({ day, label, orders: 0, revenue: 0 }));
  for (const o of curOrders) {
    if (o.orderStatus === "CANCELLED") continue;
    const d = new Date(o.createdAt.getTime() + 3 * 3600000);
    dowBuckets[d.getUTCDay()].orders += 1;
    dowBuckets[d.getUTCDay()].revenue += toNum(o.totalAmount);
  }

  // ── Top Vendors ───────────────────────────────────────────────────────────
  // ✅ orders.vendorId refs vendorProfiles.id (not userId)
  const vendorMap: Record<string, { revenue: number; orders: number; delivered: number }> = {};
  for (const o of curOrders) {
    if (!o.vendorId) continue;
    if (!vendorMap[o.vendorId]) vendorMap[o.vendorId] = { revenue: 0, orders: 0, delivered: 0 };
    if (o.orderStatus !== "CANCELLED") vendorMap[o.vendorId].revenue += toNum(o.totalAmount);
    vendorMap[o.vendorId].orders += 1;
    if (o.orderStatus === "DELIVERED") vendorMap[o.vendorId].delivered += 1;
  }
  // ✅ select vendorProfiles.id (pk) and shopName (not businessName)
  const vendorInfo = await db.select({ id: vendorProfiles.id, shopName: vendorProfiles.shopName }).from(vendorProfiles);
  const vendorInfoMap = Object.fromEntries(vendorInfo.map((v) => [v.id, v.shopName]));
  const topVendors: TopVendor[] = Object.entries(vendorMap)
    .map(([id, m]) => ({
      vendorId: id,
      shopName: vendorInfoMap[id] ?? "Unknown Vendor",
      totalRevenue: m.revenue,
      totalOrders: m.orders,
      avgOrderValue: m.orders ? m.revenue / m.orders : 0,
      delivered: m.delivered,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // ── Top Affiliates ────────────────────────────────────────────────────────
  // ✅ orders.affiliateId refs affiliateProfiles.id (not userId)
  const affMap: Record<string, { commissions: number; orders: number; conversions: number }> = {};
  for (const o of curOrders) {
    if (!o.affiliateId) continue;
    if (!affMap[o.affiliateId]) affMap[o.affiliateId] = { commissions: 0, orders: 0, conversions: 0 };
    affMap[o.affiliateId].orders += 1;
    if (o.orderStatus !== "CANCELLED") {
      affMap[o.affiliateId].commissions += toNum(o.affiliateCommission);
      affMap[o.affiliateId].conversions += 1;
    }
  }
  const affIds = Object.keys(affMap);
  let topAffiliates: TopAffiliate[] = [];
  if (affIds.length) {
    // ✅ affiliateProfiles.fullName (not displayName), join via userId to get email
    const afRows = await db
      .select({ id: affiliateProfiles.id, fullName: affiliateProfiles.fullName, userId: affiliateProfiles.userId })
      .from(affiliateProfiles)
      .where(inArray(affiliateProfiles.id, affIds));
    const afUserIds = afRows.map((a) => a.userId);
    const afUsers = afUserIds.length
      ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, afUserIds))
      : [];
    const afUserEmailMap = Object.fromEntries(afUsers.map((u) => [u.id, u.email]));
    const afRowMap = Object.fromEntries(afRows.map((a) => [a.id, a]));
    topAffiliates = Object.entries(affMap)
      .map(([id, m]) => {
        const ar = afRowMap[id];
        return {
          affiliateId: id,
          fullName: ar?.fullName ?? "Affiliate",
          email: ar ? (afUserEmailMap[ar.userId] ?? "") : "",
          totalCommissions: m.commissions,
          totalOrders: m.orders,
          conversionOrders: m.conversions,
        };
      })
      .sort((a, b) => b.totalCommissions - a.totalCommissions)
      .slice(0, 10);
  }

  // ── Top Products ──────────────────────────────────────────────────────────
  const prodMap: Record<string, { revenue: number; units: number; orders: number; vendorId: string }> = {};
  for (const o of curOrders) {
    if (!o.productId) continue;
    if (!prodMap[o.productId]) prodMap[o.productId] = { revenue: 0, units: 0, orders: 0, vendorId: o.vendorId };
    if (o.orderStatus !== "CANCELLED") {
      prodMap[o.productId].revenue += toNum(o.totalAmount);
      prodMap[o.productId].units += o.quantity ?? 1;
    }
    prodMap[o.productId].orders += 1;
  }
  // ✅ products.title (not name), products.vendorId refs vendorProfiles.id
  const prodInfo = await db.select({ id: products.id, title: products.title, vendorId: products.vendorId }).from(products);
  const prodInfoMap = Object.fromEntries(prodInfo.map((p) => [p.id, p]));
  const vShopMap = Object.fromEntries(vendorInfo.map((v) => [v.id, v.shopName]));
  const topProducts: TopProduct[] = Object.entries(prodMap)
    .map(([id, m]) => ({
      productId: id,
      productTitle: prodInfoMap[id]?.title ?? "Unknown Product",
      // ✅ products.vendorId refs vendorProfiles.id → look up by vendorProfiles.id
      vendorShopName: m.vendorId ? (vShopMap[m.vendorId] ?? "—") : "—",
      totalRevenue: m.revenue,
      totalUnits: m.units,
      totalOrders: m.orders,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // ── User Growth ───────────────────────────────────────────────────────────
  // ✅ roleEnum: VENDOR | AFFILIATE | BOTH | ADMIN — no CUSTOMER role
  const allUserRows = await db.select({ role: users.role, createdAt: users.createdAt }).from(users);
  const growthDays = Math.min(days, 90);
  const growthBuckets: Record<string, { vendors: number; affiliates: number }> = {};
  for (let i = 0; i < growthDays; i++) {
    const d = new Date(periodStart.getTime() + i * 86400000);
    growthBuckets[d.toISOString().slice(0, 10)] = { vendors: 0, affiliates: 0 };
  }
  for (const u of allUserRows) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10);
    if (growthBuckets[key]) {
      if (u.role === "VENDOR" || u.role === "BOTH") growthBuckets[key].vendors += 1;
      if (u.role === "AFFILIATE" || u.role === "BOTH") growthBuckets[key].affiliates += 1;
    }
  }
  const userGrowth: UserGrowth[] = Object.entries(growthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, g]) => ({ date, ...g }));

  // ── M-Pesa ────────────────────────────────────────────────────────────────
  // ✅ mpesaStatusEnum: PENDING | SUCCESS | FAILED | TIMEOUT (no PAID)
  const mpesaTxns = await db
    .select({ status: mpesaTransactions.status, amount: mpesaTransactions.amount })
    .from(mpesaTransactions)
    .where(gte(mpesaTransactions.createdAt, periodStart));
  const mpesaSuccess = mpesaTxns.filter((t) => t.status === "SUCCESS");
  const totalVolume = mpesaSuccess.reduce((s, t) => s + toNum(t.amount), 0);
  const mpesa: MpesaStats = {
    total: mpesaTxns.length,
    success: mpesaSuccess.length,
    failed: mpesaTxns.filter((t) => t.status === "FAILED").length,
    timeout: mpesaTxns.filter((t) => t.status === "TIMEOUT").length,
    pending: mpesaTxns.filter((t) => t.status === "PENDING").length,
    successRate: mpesaTxns.length ? (mpesaSuccess.length / mpesaTxns.length) * 100 : 0,
    totalVolume,
    avgAmount: mpesaSuccess.length ? totalVolume / mpesaSuccess.length : 0,
  };

  // ── Payouts ───────────────────────────────────────────────────────────────
  const allPayouts = await db.select().from(payoutRequests);
  const pSum = (status: string) => {
    const r = allPayouts.filter((p) => p.status === status);
    return { count: r.length, amount: r.reduce((s, p) => s + toNum(p.amount), 0) };
  };
  const pendingPays = allPayouts.filter((p) => p.status === "REQUESTED" || p.status === "APPROVED");
  const payouts: PayoutSummary = {
    pendingCount: pSum("REQUESTED").count, pendingAmount: pSum("REQUESTED").amount,
    approvedCount: pSum("APPROVED").count, approvedAmount: pSum("APPROVED").amount,
    paidCount: pSum("PAID").count, paidAmount: pSum("PAID").amount,
    rejectedCount: pSum("REJECTED").count,
    // ✅ payoutRoleEnum: VENDOR | AFFILIATE
    vendorPending: pendingPays.filter((p) => p.role === "VENDOR").length,
    affiliatePending: pendingPays.filter((p) => p.role === "AFFILIATE").length,
  };

  // ── Repeat customers (by customerPhone as identifier — no FK to users) ────
  const orderPhones: string[] = curOrders.map((o) => o.customerPhone);
  const phoneCount: Record<string, number> = {};
  for (const p of orderPhones) phoneCount[p] = (phoneCount[p] ?? 0) + 1;
  const uniquePhones = Object.keys(phoneCount);
  const repeatPhones = uniquePhones.filter((p) => phoneCount[p] > 1).length;
  const customerRepeat: CustomerRepeatStats = {
    firstTime: uniquePhones.length - repeatPhones,
    repeat: repeatPhones,
    repeatRate: uniquePhones.length ? (repeatPhones / uniquePhones.length) * 100 : 0,
  };

  // ── Global counts ─────────────────────────────────────────────────────────
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);
  const [{ totalVendors }] = await db.select({ totalVendors: count() }).from(vendorProfiles);
  const [{ totalAffiliates }] = await db.select({ totalAffiliates: count() }).from(affiliateProfiles);
  const [{ totalProducts }] = await db.select({ totalProducts: count() }).from(products);

  return {
    period,
    totalRevenue: cur.revenue, prevRevenue: prev.revenue,
    totalOrders: cur.count, prevOrders: prev.count,
    totalCommissions: cur.commissions, prevCommissions: prev.commissions,
    platformFees: cur.fees, prevPlatformFees: prev.fees,
    avgOrderValue: cur.avg, prevAvgOrderValue: prev.avg,
    deliveryRate, cancellationRate,
    dailyRevenue, orderFunnel,
    topVendors, topAffiliates, topProducts,
    userGrowth, mpesa, payouts,
    hourOfDay: hourBuckets,
    dayOfWeek: dowBuckets,
    customerRepeat,
    totalUsers, totalVendors, totalAffiliates, totalProducts,
  };
}
