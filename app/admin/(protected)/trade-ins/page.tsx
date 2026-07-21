import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { listAdminTradeIns } from "@/actions/admin/trade-ins";
import { TradeInListClient } from "./trade-in-list-client";

export const metadata: Metadata = {
  title: "Trade-In Requests - Admin",
};

export default async function AdminTradeInsPage() {
  const items = await listAdminTradeIns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="size-6 text-foreground" /> Device Trade-In &amp; Swap Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review customer device evaluations, approve swap credit valuations, and contact customers for inspection.
          </p>
        </div>
      </div>

      <TradeInListClient initialItems={items} />
    </div>
  );
}
