import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/healpers/auth-server";
import { getAnalyticsData } from "@/action/AdminAnalyticalAction";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import AdminAnalyticsClient from "@/components/admin/AdminAnalyticsClient";
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  noStore();

  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  // Default to 30-day view on first load
  const data = await getAnalyticsData("30d");

  return (
    // <DashboardShell role="ADMIN" >
        <DashboardShell role="ADMIN" vendorName={ user.name }>
      <AdminAnalyticsClient initialData={data} />
    </DashboardShell>
  );
}
