"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/format";
import { updateInstallmentStatus, type InstallmentApplicationRow } from "@/actions/admin/installments";

export function InstallmentListClient({ initialItems }: { initialItems: InstallmentApplicationRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeCardView, setActiveCardView] = useState<{ front: string; back: string; name: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: "approved" | "rejected" | "completed") {
    setLoadingId(id);
    try {
      const res = await updateInstallmentStatus(id, status);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update status");
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      toast.success(`Application marked as ${status}`);
    } catch {
      toast.error("Error updating installment application status");
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-white">
        No hire purchase / installment applications submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border border-border bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Customer & Ghana Card</th>
              <th className="p-3.5">Product</th>
              <th className="p-3.5">40% Deposit Paid</th>
              <th className="p-3.5">Remaining Balance</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-3.5">
                  <div className="font-bold text-foreground text-sm">{item.applicantName}</div>
                  <div className="text-muted-foreground mt-0.5">{item.applicantPhone}</div>
                  <div className="font-mono text-[11px] text-foreground mt-1 font-semibold">
                    ID: {item.ghanaCardNumber}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCardView({ front: item.ghanaCardFrontUrl, back: item.ghanaCardBackUrl, name: item.applicantName })}
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] hover:underline"
                  >
                    <Eye className="size-3" /> View Ghana Card Photos
                  </button>
                </td>

                <td className="p-3.5">
                  <div className="font-semibold text-foreground">{item.productName}</div>
                  <div className="text-muted-foreground mt-0.5">Base: {formatPrice(item.basePrice)}</div>
                  <div className="text-muted-foreground">Total (20% Plan): {formatPrice(item.totalPrice)}</div>
                </td>

                <td className="p-3.5 font-bold text-green-700 font-mono text-sm">
                  {formatPrice(item.depositAmount)}
                </td>

                <td className="p-3.5 font-semibold text-foreground font-mono">
                  {formatPrice(item.remainingBalance)}
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
                    {item.status.replace("_", " ")}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-1">{formatDate(item.createdAt)}</div>
                </td>

                <td className="p-3.5 text-right space-x-1.5">
                  {item.status === "pending_review" && (
                    <>
                      <Button
                        size="sm"
                        disabled={loadingId === item.id}
                        onClick={() => handleStatusChange(item.id, "approved")}
                        className="rounded-none bg-green-700 hover:bg-green-800 text-white text-[10px] px-2.5 py-1 h-auto"
                      >
                        <Check className="size-3 mr-1" /> Approve
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
                      <CreditCard className="size-3 mr-1" /> Mark Paid / Completed
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ghana Card Modal Viewer */}
      {activeCardView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white max-w-2xl w-full p-6 border border-border space-y-4 relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading text-base font-bold text-foreground">
                Ghana Card Verification — {activeCardView.name}
              </h3>
              <button
                type="button"
                onClick={() => setActiveCardView(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Front Side</p>
                <div className="aspect-[3/2] border border-border bg-muted/10 overflow-hidden flex items-center justify-center">
                  <img src={activeCardView.front} alt="Ghana Card Front" className="size-full object-contain" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Back Side</p>
                <div className="aspect-[3/2] border border-border bg-muted/10 overflow-hidden flex items-center justify-center">
                  <img src={activeCardView.back} alt="Ghana Card Back" className="size-full object-contain" />
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button onClick={() => setActiveCardView(null)} variant="outline" className="rounded-none text-xs">
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
