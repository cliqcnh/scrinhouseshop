"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Ticket, ToggleLeft, ToggleRight, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/format";
import {
  createCoupon,
  toggleCouponActive,
  deleteCoupon,
  type CouponRow,
} from "@/actions/admin/coupons";

export function CouponManagerClient({ initialItems }: { initialItems: CouponRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [isCreating, setIsCreating] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCoupon({
        code: code.trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        expiresAt: expiresAt.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to create coupon");
        return;
      }

      toast.success(`Coupon "${code.toUpperCase()}" created and active!`);
      setIsCreating(false);
      setCode("");
      setMaxUses("");
      setExpiresAt("");
      window.location.reload();
    } catch {
      toast.error("An error occurred creating coupon.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await toggleCouponActive(id, !currentStatus);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update coupon status");
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: !currentStatus } : item))
      );
      toast.success(`Coupon status updated!`);
    } catch {
      toast.error("Error toggling coupon active status.");
    }
  }

  async function handleDelete(id: string, couponCode: string) {
    if (!confirm(`Are you sure you want to delete coupon "${couponCode}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await deleteCoupon(id);
      if (!res.success) {
        toast.error(res.error ?? "Failed to delete coupon");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Coupon "${couponCode}" deleted successfully.`);
    } catch {
      toast.error("Error deleting coupon.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsCreating((p) => !p)}
          className="rounded-none bg-foreground text-background text-xs font-semibold uppercase tracking-wider gap-2"
        >
          <Plus className="size-4" /> {isCreating ? "Cancel" : "Create New Coupon"}
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="border border-border p-6 bg-white space-y-4 shadow-sm">
          <div className="border-b border-border pb-3">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
              Add New Discount Coupon
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Discounts created here are active immediately for customer checkout.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="cpn-code" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Coupon Code *
              </label>
              <input
                id="cpn-code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WELCOME10"
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none uppercase font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor="cpn-type" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Discount Type
              </label>
              <select
                id="cpn-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-medium"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (GHS)</option>
              </select>
            </div>

            <div>
              <label htmlFor="cpn-val" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Discount Value *
              </label>
              <input
                id="cpn-val"
                type="number"
                min="0.5"
                step="0.5"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
            </div>

            <div>
              <label htmlFor="cpn-min" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Min Order Total (GHS)
              </label>
              <input
                id="cpn-min"
                type="number"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                placeholder="0 (No Minimum)"
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
            </div>

            <div>
              <label htmlFor="cpn-max-uses" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Max Uses (Optional)
              </label>
              <input
                id="cpn-max-uses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Leave blank for unlimited"
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leave empty for unlimited redemptions</p>
            </div>

            <div>
              <label htmlFor="cpn-expires" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Expiry Date (Optional)
              </label>
              <input
                id="cpn-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Leave blank for permanent (no expiration)</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="rounded-none text-xs font-semibold uppercase tracking-wider"
            >
              {isSubmitting ? "Saving..." : "Save Promo Coupon"}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-white">
          No discount coupons created yet. Click &quot;Create New Coupon&quot; to add one.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Min Order</th>
                <th className="p-3.5">Usage Limit</th>
                <th className="p-3.5">Expiration</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const isExpired = Boolean(
                  item.expiresAt && new Date(item.expiresAt).getTime() < Date.now()
                );

                return (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Ticket className="size-4 text-foreground" /> {item.code}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Created {formatDate(item.createdAt)}</div>
                    </td>

                    <td className="p-3.5 font-semibold text-foreground">
                      {item.discountType === "percentage"
                        ? `${item.discountValue}% OFF`
                        : `GH₵${item.discountValue.toFixed(2)} OFF`}
                    </td>

                    <td className="p-3.5 font-mono text-muted-foreground">
                      {item.minOrderAmount > 0 ? formatPrice(item.minOrderAmount) : "No Minimum"}
                    </td>

                    <td className="p-3.5 font-mono text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.usedCount}</span>
                      {" / "}
                      <span>{item.maxUses !== null && item.maxUses !== undefined ? item.maxUses : "∞"}</span>
                    </td>

                    <td className="p-3.5">
                      {item.expiresAt ? (
                        isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 border border-rose-200">
                            <AlertTriangle className="size-3" /> Expired ({formatDate(item.expiresAt)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="size-3" /> Until {formatDate(item.expiresAt)}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                          No Expiry
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                          item.isActive && !isExpired
                            ? "border-green-600 bg-green-50 text-green-700"
                            : "border-gray-300 bg-gray-50 text-gray-500"
                        }`}
                      >
                        {item.isActive && !isExpired ? "Active" : item.isActive && isExpired ? "Expired" : "Inactive"}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id, item.isActive)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                        >
                          {item.isActive ? (
                            <ToggleRight className="size-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="size-5 text-muted-foreground" />
                          )}
                          <span>{item.isActive ? "Disable" : "Enable"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.code)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Delete Coupon"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
