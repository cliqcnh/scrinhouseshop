import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { listAdminSubscriptions } from "@/actions/admin/care";
import { CareListClient } from "./care-list-client";

export const metadata: Metadata = {
  title: "Admin Subscriptions Console - ScrinHouse Care",
};

export default async function AdminCarePage() {
  const subscriptions = await listAdminSubscriptions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="size-6 text-foreground" /> ScrinHouse Care Protection
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track active customer device subscriptions, check device IMEI specs, and register repair claims.
          </p>
        </div>
      </div>

      <CareListClient initialItems={subscriptions} />
    </div>
  );
}
