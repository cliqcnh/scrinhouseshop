"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/format";
import { updateTradeInStatus, type TradeInRequestRow } from "@/actions/admin/trade-ins";

export function TradeInListClient({ initialItems }: { initialItems: TradeInRequestRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, number>>({});

  async function handleStatusChange(id: string, status: "approved" | "rejected" | "completed") {
    const offeredQuote = quotes[id];
    if (status === "approved" && (!offeredQuote || offeredQuote <= 0)) {
      toast.error("Please enter a valid GHS valuation quote before approving.");
      return;
    }

    setLoadingId(id);
    try {
      const res = await updateTradeInStatus(id, status, offeredQuote);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update status");
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, estimatedValue: offeredQuote ?? item.estimatedValue } : item))
      );
      toast.success(`Trade-in valuation set to GH₵${offeredQuote?.toFixed(2)} & marked as ${status}`);
    } catch {
      toast.error("Error updating trade-in status");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-white">
        No device trade-in requests submitted yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-white">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
          <tr>
            <th className="p-3.5">Customer &amp; Phone</th>
            <th className="p-3.5">Device &amp; Specs</th>
            <th className="p-3.5">Condition Rating</th>
            <th className="p-3.5">Admin Quote (GHS)</th>
            <th className="p-3.5">Status</th>
            <th className="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/10 transition-colors">
              <td className="p-3.5">
                <div className="font-bold text-foreground text-sm">{item.applicantName}</div>
                <div className="text-muted-foreground font-mono mt-0.5">{item.contactPhone}</div>
                {item.notes && <div className="text-[11px] text-muted-foreground italic mt-1">&quot;{item.notes}&quot;</div>}
              </td>

              <td className="p-3.5">
                <div className="font-bold text-foreground">{item.brand} {item.model}</div>
                <div className="text-muted-foreground mt-0.5">Storage: {item.storage}</div>
              </td>

              <td className="p-3.5 space-y-0.5 text-muted-foreground">
                <div>Screen: <span className="font-semibold text-foreground capitalize">{item.screenCondition}</span></div>
                <div>Body: <span className="font-semibold text-foreground capitalize">{item.conditionGrade.replace("_", " ")}</span></div>
                <div>Battery: <span className="font-semibold text-foreground">{item.batteryHealth === "good" ? ">80%" : "<80%"}</span></div>
              </td>

              <td className="p-3.5">
                {item.status === "pending" ? (
                  <div className="relative w-32">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="Valuation GHS"
                      value={quotes[item.id] ?? ""}
                      onChange={(e) => setQuotes((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-full border border-border px-2.5 py-1.5 text-xs font-mono font-bold text-foreground focus:border-foreground focus:outline-none rounded-none"
                    />
                  </div>
                ) : (
                  <div className="font-bold text-green-700 font-mono text-sm">
                    {formatPrice(item.estimatedValue)}
                  </div>
                )}
              </td>

              <td className="p-3.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                    item.status === "approved"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : item.status === "rejected"
                      ? "border-red-600 bg-red-50 text-red-700"
                      : item.status === "completed"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-amber-600 bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.status}
                </span>
                <div className="text-[10px] text-muted-foreground mt-1">{formatDate(item.createdAt)}</div>
              </td>

              <td className="p-3.5 text-right space-x-1.5">
                {item.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      disabled={loadingId === item.id}
                      onClick={() => handleStatusChange(item.id, "approved")}
                      className="rounded-none bg-green-700 hover:bg-green-800 text-white text-[10px] px-2.5 py-1 h-auto font-bold"
                    >
                      <Check className="size-3 mr-1" /> Set Quote &amp; Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === item.id}
                      onClick={() => handleStatusChange(item.id, "rejected")}
                      className="rounded-none border-red-200 text-red-700 hover:bg-red-50 text-[10px] px-2.5 py-1 h-auto"
                    >
                      <X className="size-3 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {item.status === "approved" && (
                  <Button
                    size="sm"
                    disabled={loadingId === item.id}
                    onClick={() => handleStatusChange(item.id, "completed")}
                    className="rounded-none bg-foreground text-background text-[10px] px-2.5 py-1 h-auto"
                  >
                    <RefreshCw className="size-3 mr-1" /> Complete Swap
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
