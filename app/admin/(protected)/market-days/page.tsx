import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { getAdminMarketStats, getAdminEvents, getAvailableProducts } from "@/actions/admin/market-days";
import { MarketDaysAdminClient } from "@/components/admin/market-days-client";

export const metadata: Metadata = {
  title: "Market Days Management - Admin",
};

export default async function AdminMarketDaysPage() {
  const [stats, events, products] = await Promise.all([
    getAdminMarketStats(),
    getAdminEvents(),
    getAvailableProducts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Flame className="size-6 text-red-600 animate-pulse" /> Market Days Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Setup Tuesday and Saturday sales events, allocate flash discounts, manage live bidding auctions, and track event revenue.
          </p>
        </div>
      </div>

      <MarketDaysAdminClient
        initialStats={stats}
        initialEvents={events}
        availableProducts={products}
      />
    </div>
  );
}
