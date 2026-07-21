import { BarChart3 } from "lucide-react";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return (
    <AdminComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Sales, repair revenue, and inventory-value reporting need real orders first — coming in a later phase."
    />
  );
}
