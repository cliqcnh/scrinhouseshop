"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Ticket, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/format";
import { createCoupon, toggleCouponActive, type CouponRow } from "@/actions/admin/coupons";

export function CouponManagerClient({ initialItems }: { initialItems: CouponRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [isCreating, setIsCreating] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderAmount, setMinOrderAmount] = useState(0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }

    try {
      const res = await createCoupon({
        code,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount),
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to create coupon");
        return;
      }

      toast.success(`Coupon "${code.toUpperCase()}" created!`);
      setIsCreating(false);
      setCode("");
      window.location.reload();
    } catch {
      toast.error("An error occurred creating coupon.");
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await toggleCouponActive(id, !currentStatus);
      if (!res.success) {
        toast.error(res.error ?? "Failed to update coupon status");
        return;
      }

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isActive: !currentStatus } : item)));
      toast.success(`Coupon status updated!`);
    } catch {
      toast.error("Error toggling coupon active status.");
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
        <form onSubmit={handleCreate} className="border border-border p-6 bg-white space-y-4">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3">
            Add New Discount Coupon
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                min="1"
                step="0.5"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
            </div>

            <div>
              <label htmlFor="cpn-min" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Min Order (GHS)
              </label>
              <input
                id="cpn-min"
                type="number"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" size="sm" className="rounded-none text-xs font-semibold uppercase tracking-wider">
              Save Promo Coupon
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-white">
          No discount coupons created yet. Click &quot;Create New Coupon&quot; to add one.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Min Order Total</th>
                <th className="p-3.5">Times Used</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-foreground text-sm flex items-center gap-1.5">
                      <Ticket className="size-4 text-foreground" /> {item.code}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(item.createdAt)}</div>
                  </td>

                  <td className="p-3.5 font-semibold text-foreground">
                    {item.discountType === "percentage" ? `${item.discountValue}% OFF` : `GH₵${item.discountValue.toFixed(2)} OFF`}
                  </td>

                  <td className="p-3.5 font-mono text-muted-foreground">
                    {item.minOrderAmount > 0 ? formatPrice(item.minOrderAmount) : "No Minimum"}
                  </td>

                  <td className="p-3.5 font-mono font-semibold text-foreground">
                    {item.usedCount} {item.maxUses ? `/ ${item.maxUses}` : ""}
                  </td>

                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                        item.isActive
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 bg-gray-50 text-gray-500"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id, item.isActive)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                    >
                      {item.isActive ? <ToggleRight className="size-5 text-green-600" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
                      {item.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
