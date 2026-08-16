"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Eye, X, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate } from "@/utils/format";
import {
  updateInstallmentStatus,
  recordInstallmentPayment,
  type InstallmentApplicationRow,
} from "@/actions/admin/installments";

export function InstallmentListClient({ initialItems }: { initialItems: InstallmentApplicationRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeCardView, setActiveCardView] = useState<{ front: string; back: string; name: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Payment Recording State
  const [paymentModalApp, setPaymentModalApp] = useState<InstallmentApplicationRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentModalApp) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await recordInstallmentPayment(paymentModalApp.id, amt, paymentMethod, paymentRef);
      if (!res.success) {
        toast.error(res.error ?? "Failed to record payment");
        return;
      }

      // Update local item status, remaining balance, and append new payment
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === paymentModalApp.id) {
            const newBalance = Math.max(0, item.remainingBalance - amt);
            const newStatus = newBalance <= 0 ? "completed" : item.status;
            return {
              ...item,
              remainingBalance: newBalance,
              status: newStatus,
              payments: [
                ...item.payments,
                {
                  id: Math.random().toString(),
                  amount: amt,
                  paymentMethod,
                  paymentRef: paymentRef || `MAN-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                },
              ],
            };
          }
          return item;
         })
      );

      toast.success(`Recorded payment of ${formatPrice(amt)} successfully!`);
      setPaymentModalApp(null);
      setPaymentAmount("");
      setPaymentMethod("manual");
      setPaymentRef("");
    } catch {
      toast.error("Error saving installment payment");
    } finally {
      setPaymentLoading(false);
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
                    onClick={() =>
                      setActiveCardView({
                        front: item.ghanaCardFrontUrl,
                        back: item.ghanaCardBackUrl,
                        name: item.applicantName,
                      })
                    }
                    className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#1d4ed8] hover:underline"
                  >
                    <Eye className="size-3" /> View Ghana Card Photos
                  </button>
                </td>

                <td className="p-3.5">
                  <div className="font-semibold text-foreground">{item.productName}</div>
                  <div className="text-muted-foreground mt-0.5">Base: {formatPrice(item.basePrice)}</div>
                  <div className="text-muted-foreground">Total Plan: {formatPrice(item.totalPrice)}</div>
                </td>

                <td className="p-3.5 font-bold text-green-700 font-mono text-sm">
                  {formatPrice(item.depositAmount)}
                </td>

                <td className="p-3.5">
                  <div className="font-bold text-foreground font-mono text-sm">
                    {formatPrice(item.remainingBalance)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    Plan: <span className="font-semibold capitalize text-foreground">{item.installmentFrequency}</span>
                  </div>
                  {item.payments.length > 0 && (
                    <div className="text-[10px] font-semibold text-green-700 mt-1 flex items-center gap-1">
                      <CreditCard className="size-3" />
                      <span>{item.payments.length} payment(s) logged</span>
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
                    {item.status.replace("_", " ")}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-1">{formatDate(item.createdAt)}</div>
                </td>

                <td className="p-3.5 text-right space-y-1.5">
                  {item.status === "pending_review" && (
                    <div className="flex justify-end gap-1.5">
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
                    </div>
                  )}
                  {item.status === "approved" && (
                    <div className="flex flex-col gap-1.5 items-end">
                      <Button
                        size="sm"
                        onClick={() => setPaymentModalApp(item)}
                        className="rounded-none bg-green-700 hover:bg-green-800 text-white text-[10px] px-2.5 py-1 h-auto font-bold w-full max-w-[130px] justify-center"
                      >
                        <Plus className="size-3 mr-1" /> Record Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingId === item.id}
                        onClick={() => handleStatusChange(item.id, "completed")}
                        className="rounded-none border-border text-foreground hover:bg-muted text-[10px] px-2.5 py-1 h-auto w-full max-w-[130px] justify-center"
                      >
                        <Check className="size-3 mr-1" /> Complete Plan
                      </Button>
                    </div>
                  )}
                  {item.status === "completed" && (
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Plan Completed</span>
                  )}
                  {item.status === "rejected" && (
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Rejected</span>
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

      {/* Record Payment Modal */}
      {paymentModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white max-w-md w-full p-6 border border-border space-y-4 relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading text-base font-bold text-foreground">
                Record Installment Payment
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalApp(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-muted/10 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold text-foreground">{paymentModalApp.applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product:</span>
                <span className="font-semibold text-foreground">{paymentModalApp.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Plan:</span>
                <span className="font-bold capitalize text-foreground">{paymentModalApp.installmentFrequency}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                <span className="text-foreground">Remaining Balance:</span>
                <span className="font-mono text-red-600">{formatPrice(paymentModalApp.remainingBalance)}</span>
              </div>
            </div>

            {/* Payments Log History */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Payment History</p>
              {paymentModalApp.payments.length > 0 ? (
                <div className="border border-border divide-y divide-border text-xs max-h-36 overflow-y-auto">
                  <div className="p-2 bg-muted/20 text-[9px] font-bold text-muted-foreground uppercase tracking-wider grid grid-cols-3">
                    <span>Date</span>
                    <span>Method / Ref</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {paymentModalApp.payments.map((p) => (
                    <div key={p.id} className="p-2 grid grid-cols-3 text-muted-foreground">
                      <span>{formatDate(p.createdAt)}</span>
                      <span className="truncate">{p.paymentMethod} ({p.paymentRef})</span>
                      <span className="text-right font-semibold text-foreground font-mono">{formatPrice(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-border p-3 text-center text-xs text-muted-foreground bg-muted/5">
                  No payments recorded yet.
                </div>
              )}
            </div>

            {/* Payment Insertion Form */}
            {paymentModalApp.remainingBalance > 0 ? (
              <form onSubmit={handleRecordPayment} className="space-y-3.5 border-t border-border pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Amount to Pay (GHS)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentModalApp.remainingBalance}
                    placeholder="e.g. 250.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="rounded-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full text-xs h-9 px-2 border border-input bg-transparent focus:ring-1 focus:ring-ring"
                    >
                      <option value="manual">Manual Cash</option>
                      <option value="momo">Mobile Money</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="paystack">Paystack</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reference (Optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. TX-94182"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="rounded-none text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentModalApp(null)}
                    className="rounded-none text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={paymentLoading}
                    className="rounded-none bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4"
                  >
                    {paymentLoading ? "Saving..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center text-xs font-bold text-green-700 py-2 border-t border-border pt-4">
                This Hire Purchase plan is fully paid!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
