import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/healpers/auth-server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import AdminOrdersClient from "@/components/admin/AdminOrdersClient";
import { getAdminOrdersData } from "@/action/AdminOrderAction";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  noStore();

  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const {
    orders,
    counts,
    totalRevenue,
    totalCommissions,
    totalPlatformFees,
    avgOrderValue,
    vendors,
    affiliates,
  } = await getAdminOrdersData();

  return (
    <DashboardShell role="ADMIN" vendorName={ user.name }>
      <AdminOrdersClient
        initialOrders={orders}
        initialCounts={counts}
        totalRevenue={totalRevenue}
        totalCommissions={totalCommissions}
        totalPlatformFees={totalPlatformFees}
        avgOrderValue={avgOrderValue}
        vendors={vendors}
        affiliates={affiliates}
      />
    </DashboardShell>
  );
}
