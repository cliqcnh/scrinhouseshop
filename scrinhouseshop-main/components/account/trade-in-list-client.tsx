"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Check, ArrowRight } from "lucide-react";
import { formatPrice, formatDate } from "@/utils/format";
import { acceptTradeInValuation } from "@/actions/storefront/trade-in";
import { Button } from "@/components/ui/button";

interface TradeIn {
  id: string;
  brand: string;
  model: string;
  storage: string;
  conditionGrade: string;
  screenCondition: string;
  batteryHealth: string;
  estimatedValue: number;
  contactPhone: string;
  status: string;
  createdAt: string;
}

export function CustomerTradeInList({ initialItems }: { initialItems: TradeIn[] }) {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAccept(id: string) {
    setLoadingId(id);
    try {
      const res = await acceptTradeInValuation(id);
      if (!res.success) {
        toast.error(res.error ?? "Failed to accept valuation");
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "accepted" } : item))
      );
      toast.success("Valuation accepted successfully! Please deliver the device to our shop to release your credit.");
    } catch {
      toast.error("Error accepting trade-in valuation");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background rounded-none">
        <RefreshCw className="size-9 text-muted-foreground/30 animate-spin-slow" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">You don&apos;t have any device trade-in requests submitted.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border bg-background rounded">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
            <th className="px-4 py-3">Device Specs</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Offer Value</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <td className="px-4 py-3.5">
                <span className="font-semibold text-foreground">{item.brand} {item.model}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Storage: {item.storage}
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs text-muted-foreground space-y-0.5">
                <div>Screen: <span className="font-medium text-foreground">{item.screenCondition}</span></div>
                <div>Body: <span className="font-medium text-foreground capitalize">{item.conditionGrade.replace("_", " ")}</span></div>
              </td>
              <td className="px-4 py-3.5 text-foreground font-semibold font-mono">
                {item.estimatedValue > 0 ? formatPrice(item.estimatedValue) : "Pending Quote"}
              </td>
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  item.status === "completed"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : item.status === "accepted"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : item.status === "valued"
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : item.status === "rejected"
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-amber-600 bg-amber-50 text-amber-700"
                }`}>
                  {item.status}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-1">
                  Submitted: {formatDate(item.createdAt)}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                {item.status === "valued" && (
                  <Button
                    size="sm"
                    disabled={loadingId === item.id}
                    onClick={() => handleAccept(item.id)}
                    className="rounded-none bg-foreground text-background text-xs font-bold hover:bg-foreground/90 py-1 px-3 h-auto"
                  >
                    Accept Valuation
                  </Button>
                )}
                {item.status === "accepted" && (
                  <span className="text-xs text-muted-foreground italic flex items-center justify-end gap-1">
                    Please bring device to shop
                  </span>
                )}
                {item.status === "pending" && (
                  <span className="text-xs text-muted-foreground">Awaiting admin quote</span>
                )}
                {item.status === "completed" && (
                  <span className="text-xs text-green-700 font-bold">✓ Credit released to wallet</span>
                )}
                {item.status === "rejected" && (
                  <span className="text-xs text-red-700">Valuation rejected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
