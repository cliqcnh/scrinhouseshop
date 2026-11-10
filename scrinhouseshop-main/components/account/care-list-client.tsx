"use client";

import { Shield, CheckCircle, RefreshCw, AlertCircle, HelpCircle } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import type { CustomerCareSubscription } from "@/actions/storefront/dashboard";

export function CustomerCareList({ subscriptions }: { subscriptions: CustomerCareSubscription[] }) {
  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background rounded-none">
        <Shield className="size-9 text-muted-foreground/30" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">You don&apos;t have any active ScrinHouse Care subscriptions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscriptions.map((sub) => {
        const isActive = sub.status === "active";
        const waitPeriodDays = sub.startsAt 
          ? Math.ceil((Date.now() - new Date(sub.startsAt).getTime()) / (1000 * 60 * 60 * 24)) 
          : 0;
        const waitingLeft = Math.max(0, 60 - waitPeriodDays);

        return (
          <div key={sub.id} className="border border-border bg-background p-6 space-y-6 rounded-none">
            {/* Plan Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">{sub.tierName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Device Model: <strong className="text-foreground">{sub.deviceModel}</strong> | IMEI: <strong className="font-mono text-foreground">{sub.imeiSerial}</strong>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`inline-flex items-center rounded-none px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                  isActive
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-amber-600 bg-amber-50 text-amber-700"
                }`}>
                  {sub.status.replace("_", " ")}
                </span>
                {isActive && (
                  <span className="text-[10px] text-muted-foreground">
                    Valid until: {formatDate(sub.endsAt ?? "")}
                  </span>
                )}
              </div>
            </div>

            {/* Waiting Window Alert */}
            {isActive && waitingLeft > 0 && (
              <div className="flex gap-2.5 items-start p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertCircle className="size-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Anti-Fraud Waiting Window Active</span>
                  <span>
                    Your protection coverage starts after the first 2 months of subscription. You have **{waitingLeft} days** remaining before you can file repair claims under your plan.
                  </span>
                </div>
              </div>
            )}

            {/* Claims Ledger */}
            <div className="space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">Claims Log History</h4>
              {sub.claims.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No repair claims submitted under this plan.</p>
              ) : (
                <div className="overflow-x-auto border border-border bg-muted/5">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Repair Type</th>
                        <th className="px-3 py-2.5">Part Cost</th>
                        <th className="px-3 py-2.5">Customer Co-pay</th>
                        <th className="px-3 py-2.5">Excess Paid</th>
                        <th className="px-3 py-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {sub.claims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-muted/10">
                          <td className="px-3 py-2.5 font-sans text-muted-foreground">{formatDate(claim.createdAt)}</td>
                          <td className="px-3 py-2.5 font-sans font-medium text-foreground capitalize">{claim.claimType.replace("_", " ")}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatPrice(claim.partCost)}</td>
                          <td className="px-3 py-2.5 text-foreground font-bold">{formatPrice(claim.coPayPaid)}</td>
                          <td className="px-3 py-2.5 text-red-600 font-bold">{claim.excessPaid > 0 ? formatPrice(claim.excessPaid) : "—"}</td>
                          <td className="px-3 py-2.5 font-sans text-muted-foreground italic max-w-xs truncate">{claim.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
