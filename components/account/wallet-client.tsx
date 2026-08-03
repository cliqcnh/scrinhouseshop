"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Send, ArrowUpRight, ArrowDownRight, Landmark, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format";
import { requestWithdrawal, type WalletDetails } from "@/actions/storefront/wallet";
import { toast } from "sonner";

interface WalletClientProps {
  initialDetails: WalletDetails;
}

export function WalletClient({ initialDetails }: WalletClientProps) {
  const [details, setDetails] = useState<WalletDetails>(initialDetails);
  const [isPending, startTransition] = useTransition();

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "bank">("momo");
  const [momoProvider, setMomoProvider] = useState("mtn");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${details.referralCode}`
    : `https://scrinhouse.com/?ref=${details.referralCode}`;

  function handleCopyCode() {
    if (!details.referralCode) return;
    navigator.clipboard.writeText(details.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success("Referral code copied to clipboard!");
  }

  function handleCopyLink() {
    if (!details.referralCode) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Referral link copied to clipboard!");
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero.");
      return;
    }

    if (withdrawAmount > details.balance) {
      toast.error("Requested amount exceeds your active wallet balance.");
      return;
    }

    if (!accountNumber || !accountName) {
      toast.error("Please provide the destination account details.");
      return;
    }

    if (paymentMethod === "bank" && !bankName) {
      toast.error("Please provide the bank name.");
      return;
    }

    const payDetails = paymentMethod === "momo"
      ? { provider: momoProvider, number: accountNumber, name: accountName }
      : { bank: bankName, account: accountNumber, name: accountName };

    startTransition(async () => {
      try {
        const res = await requestWithdrawal(withdrawAmount, paymentMethod, payDetails);
        if (res.success) {
          toast.success("Withdrawal request submitted successfully.");
          setAmount("");
          setAccountNumber("");
          setAccountName("");
          setBankName("");
          
          // Re-fetch details to sync balance and pending lock state
          const { getWalletDetails } = await import("@/actions/storefront/wallet");
          const fresh = await getWalletDetails();
          setDetails(fresh);
        } else {
          toast.error(res.error ?? "Failed to submit withdrawal request.");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Top Grid: Balance and Referrals Card ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Balance Glassmorphism Card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white p-6 shadow-lg min-h-[180px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-15">
            <Landmark className="size-28" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-200 font-semibold">Wallet Balance</p>
            <h3 className="font-heading text-4xl font-extrabold mt-2 tracking-tight">
              {formatPrice(details.balance)}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 w-fit px-2.5 py-1 rounded-full backdrop-blur-sm">
            <span>Locked / Pending:</span>
            <span className="font-semibold">
              {formatPrice(
                details.withdrawals
                  .filter((w) => w.status === "pending")
                  .reduce((sum, w) => sum + w.amount, 0)
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Referrals Config Box */}
        <div className="border border-border p-6 bg-background space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Earn Referral Rewards</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Invite friends! Receive a wallet reward credit when they sign up and complete their first purchase.
            </p>
          </div>

          {details.referralCode ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1">Referral Code</label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted text-foreground font-mono text-xs px-2.5 py-1.5 border border-border flex-1 font-semibold rounded">
                    {details.referralCode}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyCode} className="h-9 px-2">
                    {copiedCode ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase text-muted-foreground block mb-1">Referral Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="bg-muted text-foreground text-xs px-2.5 py-1.5 border border-border flex-1 rounded focus:outline-none truncate"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyLink} className="h-9 px-2">
                    {copiedLink ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Generating referral link...</p>
          )}
        </div>
      </div>

      {/* ── Middle Grid: Withdraw and Transactions ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (col-span-7): Withdrawal Form */}
        <section className="lg:col-span-7 border border-border p-6 bg-background space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Request Withdrawal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit your bank details or Mobile Money wallet to cash out.
            </p>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Amount (GHS) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "momo" | "bank")}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="momo">Mobile Money (MoMo)</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            {paymentMethod === "momo" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Network Provider *</label>
                  <select
                    value={momoProvider}
                    onChange={(e) => setMomoProvider(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="telecel">Telecel Cash</option>
                    <option value="airteltigo">AT Money</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">MoMo Account Number *</label>
                  <input
                    type="tel"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 055..."
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. GCB, Ecobank"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1020304050"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Recipient Account Name *</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Kofi Mensah"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full mt-2 rounded-none">
              {isPending ? "Submitting Request…" : "Submit Withdrawal Request"}
            </Button>
          </form>

          {/* Past withdrawal history list */}
          <div className="border-t border-border pt-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Withdrawal Log</h4>
            {details.withdrawals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No withdrawal requests placed yet.</p>
            ) : (
              <div className="divide-y divide-border/60 border border-border rounded overflow-hidden">
                {details.withdrawals.map((w) => (
                  <div key={w.id} className="p-3 text-xs flex justify-between items-start hover:bg-muted/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{formatPrice(w.amount)}</span>
                        <span className="text-muted-foreground">via</span>
                        <span className="uppercase text-[10px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                          {w.paymentMethod}
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-[10px]">
                        {w.paymentMethod === "momo" 
                          ? `${w.paymentDetails?.provider?.toUpperCase()} · ${w.paymentDetails?.number}`
                          : `${w.paymentDetails?.bank} · ${w.paymentDetails?.account}`}
                      </p>
                      {w.notes && <p className="text-[10px] italic text-muted-foreground">Notes: {w.notes}</p>}
                    </div>

                    <div className="text-right space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        w.status === "paid"
                          ? "bg-green-500/10 text-green-700"
                          : w.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-700"
                      }`}>
                        {w.status}
                      </span>
                      {w.paidAt && (
                        <p className="text-[10px] text-muted-foreground">
                          Paid: {new Date(w.paidAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column (col-span-5): Transactions Log list */}
        <section className="lg:col-span-5 border border-border p-6 bg-background space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Transaction History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statement of all credits and debits on your account.
            </p>
          </div>

          {details.transactions.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded text-xs text-muted-foreground">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border rounded overflow-hidden">
              {details.transactions.map((t) => {
                const isCredit = t.amount > 0;
                return (
                  <div key={t.id} className="p-3 text-xs flex justify-between items-center hover:bg-muted/10">
                    <div className="space-y-1 flex-1 pr-3">
                      <p className="font-semibold text-foreground leading-normal">{t.description}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span className="capitalize">{t.type.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isCredit ? (
                        <ArrowUpRight className="size-3.5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="size-3.5 text-red-600" />
                      )}
                      <span className={`font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                        {isCredit ? "+" : ""}{formatPrice(t.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
