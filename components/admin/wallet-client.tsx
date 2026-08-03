"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/utils/format";
import { updateWithdrawalStatus, updateReferralRewardSetting, type AdminWithdrawalRequestRow } from "@/actions/admin/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Landmark, ArrowUpRight, DollarSign, Settings, Check, X, ShieldAlert } from "lucide-react";

interface AdminWalletClientProps {
  initialRequests: AdminWithdrawalRequestRow[];
  initialReward: number;
}

export function AdminWalletClient({ initialRequests, initialReward }: AdminWalletClientProps) {
  const [requests, setRequests] = useState<AdminWithdrawalRequestRow[]>(initialRequests);
  const [rewardInput, setRewardInput] = useState(initialReward.toString());
  const [isPending, startTransition] = useTransition();

  // Filter query
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Selection/action state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const tabMatch = activeTab === "pending" ? r.status === "pending" : r.status !== "pending";
    if (!q) return tabMatch;

    return (
      tabMatch &&
      (r.applicantName.toLowerCase().includes(q) ||
        r.applicantPhone.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q))
    );
  });

  async function handleUpdateReward(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(rewardInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateReferralRewardSetting(amount);
        if (res.success) {
          toast.success(`Referral reward amount updated to GH₵ ${amount.toFixed(2)}`);
        } else {
          toast.error(res.error ?? "Failed to update reward setting.");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred.");
      }
    });
  }

  async function handleProcessPayout(action: "paid" | "rejected") {
    if (!selectedRequestId || !selectedRequest) return;

    const notes = payoutNotes.trim();
    const ref = payoutRef.trim();
    const amountVal = payoutAmount ? Number(payoutAmount) : selectedRequest.amount;

    if (action === "paid" && isNaN(amountVal)) {
      toast.error("Please enter a valid payout amount.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateWithdrawalStatus(selectedRequestId, action, notes, ref, amountVal);
        if (res.success) {
          toast.success(action === "paid" ? "Withdrawal payout processed successfully!" : "Withdrawal request rejected.");
          
          // Reset action inputs
          setSelectedRequestId(null);
          setPayoutNotes("");
          setPayoutRef("");
          setPayoutAmount("");

          // Re-fetch withdrawals lists to sync states
          const { listAdminWithdrawals } = await import("@/actions/admin/wallet");
          const freshList = await listAdminWithdrawals();
          setRequests(freshList);
        } else {
          toast.error(res.error ?? "Failed to process withdrawal update.");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred during updating.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
      
      {/* ── Left Column (col-span-8): Payouts requests list ──────────── */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Navigation Tabs and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-border pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "pending"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "history"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Historical Logs
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border text-sm text-muted-foreground rounded bg-muted/10">
            No withdrawal requests matches this filter.
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded bg-background overflow-hidden">
            {filteredRequests.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{r.applicantName}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-xs text-muted-foreground font-mono">{r.applicantPhone}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="uppercase font-semibold text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {r.paymentMethod}
                    </span>
                    <span>Requested:</span>
                    <span className="font-semibold text-foreground">{formatPrice(r.amount)}</span>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-muted/50 p-2 border border-border text-[11px] rounded text-foreground font-mono">
                    {r.paymentMethod === "momo"
                      ? `${r.paymentDetails?.provider?.toUpperCase()} Network: ${r.paymentDetails?.number} (${r.paymentDetails?.name})`
                      : `${r.paymentDetails?.bank} Account: ${r.paymentDetails?.account} (${r.paymentDetails?.name})`}
                  </div>
                  {r.notes && (
                    <p className="text-[11px] italic text-muted-foreground bg-amber-50/50 dark:bg-amber-950/20 px-2 py-1 rounded">
                      Auditor Note: {r.notes}
                    </p>
                  )}
                  {r.transactionRef && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Ref: {r.transactionRef} · Paid: {formatPrice(r.paidAmount ?? r.amount)} on {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : ""}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  {r.status === "pending" ? (
                    <Button
                      size="sm"
                      onClick={() => setSelectedRequestId(r.id)}
                      className="text-xs rounded-none h-8 font-semibold"
                    >
                      Process Payout
                    </Button>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.status === "paid"
                        ? "bg-green-500/10 text-green-700"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {r.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right Column (col-span-4): Config Settings & Audit Panel ───── */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Settings Box */}
        <section className="border border-border p-6 bg-background space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Settings className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Global Settings</h2>
          </div>

          <form onSubmit={handleUpdateReward} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1.5">
                Referral Reward (GHS)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={rewardInput}
                  onChange={(e) => setRewardInput(e.target.value)}
                  className="text-xs font-semibold"
                />
                <Button type="submit" size="sm" disabled={isPending} className="rounded-none h-9 text-xs">
                  Save
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* Process Payout Action Overlay panel */}
        {selectedRequest && (
          <section className="border-2 border-primary/40 p-6 bg-background space-y-4 rounded-lg relative">
            <button
              onClick={() => setSelectedRequestId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldAlert className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Audit & Pay</h2>
            </div>

            <div className="text-xs space-y-1.5 bg-muted/40 p-3 rounded">
              <div>
                <span className="text-muted-foreground">User:</span>{" "}
                <span className="font-semibold text-foreground">{selectedRequest.applicantName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>{" "}
                <span className="font-semibold text-foreground">{formatPrice(selectedRequest.amount)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Payout Amount (GHS, Optional)
                </label>
                <Input
                  type="number"
                  placeholder={selectedRequest.amount.toString()}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Transaction Reference (E.g. MoMo Ref)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. TX-10203040"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Payout/Audit Notes
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  rows={2}
                  className="w-full text-xs p-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => handleProcessPayout("rejected")}
                className="rounded-none h-8 text-xs font-semibold flex items-center gap-1 justify-center"
              >
                <X className="size-3.5" /> Reject
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => handleProcessPayout("paid")}
                className="rounded-none h-8 text-xs font-semibold bg-green-600 hover:bg-green-700 flex items-center gap-1 justify-center"
              >
                <Check className="size-3.5" /> Mark Paid
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
