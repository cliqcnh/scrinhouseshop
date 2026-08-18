"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/format";
import { registerCareClaim, updateCareTierSettings, type AdminSubscriptionRow } from "@/actions/admin/care";

interface CareTierRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  screen_limit: number;
  screen_copay_percentage: number;
  battery_discount: number;
  charging_port_free_count: number;
  back_glass_discount: number;
}

export function CareListClient({
  initialItems,
  initialTiers,
}: {
  initialItems: AdminSubscriptionRow[];
  initialTiers: CareTierRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [tiers, setTiers] = useState(initialTiers);
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionRow | null>(null);
  const [editingTier, setEditingTier] = useState<CareTierRow | null>(null);
  const [tierName, setTierName] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [claimType, setClaimType] = useState<"screen" | "battery" | "charging_port" | "back_glass" | "other">("screen");
  const [partCost, setPartCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdateTier(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTier) return;
    if (!tierName.trim()) {
      toast.error("Please enter a package name.");
      return;
    }
    if (!tierPrice || Number(tierPrice) < 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateCareTierSettings(editingTier.id, tierName, Number(tierPrice));
      if (!res.success) {
        toast.error(res.error ?? "Failed to update plan settings.");
        return;
      }

      toast.success("Care package settings updated!");
      setTiers((prev) =>
        prev.map((t) =>
          t.id === editingTier.id ? { ...t, name: tierName.trim(), price: Number(tierPrice) } : t
        )
      );
      setEditingTier(null);
    } catch {
      toast.error("Error saving plan updates.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;
    if (!partCost || Number(partCost) < 0) {
      toast.error("Please enter a valid parts cost.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerCareClaim({
        subscriptionId: selectedSub.id,
        claimType,
        partCost: Number(partCost),
        notes,
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to register claim");
        return;
      }

      toast.success(
        `Claim registered! Customer Co-pay: GH₵${res.coPayPaid?.toFixed(2)} | Excess Paid: GH₵${res.excessPaid?.toFixed(2)}`
      );

      // Increment claimsCount locally to reflect update
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedSub.id ? { ...item, claimsCount: item.claimsCount + 1 } : item
        )
      );

      setSelectedSub(null);
      setPartCost("");
      setNotes("");
    } catch {
      toast.error("Error registering subscription claim.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-white">
        No ScrinHouse Care subscriptions registered yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border border-border bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Customer Details</th>
              <th className="p-3.5">Device IMEI / Serial</th>
              <th className="p-3.5">Active Plan Tier</th>
              <th className="p-3.5">Valid Period</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Claims</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                <td className="p-3.5">
                  <div className="font-bold text-foreground text-sm">{item.customerName}</div>
                  <div className="text-muted-foreground mt-0.5">{item.deviceModel}</div>
                </td>

                <td className="p-3.5 font-mono text-foreground font-bold">
                  {item.imeiSerial}
                </td>

                <td className="p-3.5">
                  <div className="font-semibold text-foreground">{item.tierName}</div>
                  <div className="text-muted-foreground font-mono mt-0.5">{formatPrice(item.tierPrice)} / mo</div>
                </td>

                <td className="p-3.5 text-muted-foreground">
                  {item.startsAt ? (
                    <>
                      <div>From: <span className="font-medium text-foreground">{formatDate(item.startsAt)}</span></div>
                      <div>To: <span className="font-medium text-foreground">{formatDate(item.endsAt ?? "")}</span></div>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </td>

                <td className="p-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                      item.status === "active"
                        ? "border-green-600 bg-green-50 text-green-700"
                        : item.status === "cancelled"
                        ? "border-red-600 bg-red-50 text-red-700"
                        : item.status === "expired"
                        ? "border-orange-600 bg-orange-50 text-orange-700"
                        : "border-amber-600 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </td>

                <td className="p-3.5 font-bold font-mono text-sm text-foreground">
                  {item.claimsCount}
                </td>

                <td className="p-3.5 text-right">
                  {item.status === "active" ? (
                    <Button
                      size="sm"
                      onClick={() => setSelectedSub(item)}
                      className="rounded-none bg-foreground text-background text-[10px] px-2.5 py-1 h-auto font-bold gap-1"
                    >
                      <Plus className="size-3" /> Log Repair Claim
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Claim Submission Modal Dialog */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-border p-6 shadow-xl relative space-y-4">
            <button
              onClick={() => setSelectedSub(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">Log ScrinHouse Care Claim</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register a new repair claim for <strong className="text-foreground">{selectedSub.customerName}</strong>&apos;s IMEI <strong className="font-mono text-foreground">{selectedSub.imeiSerial}</strong>.
              </p>
            </div>

            <form onSubmit={handleRegisterClaim} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Repair Claim Type
                </label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as "screen" | "battery" | "charging_port" | "back_glass" | "other")}
                  className="w-full border border-border px-3 py-2 text-xs focus:border-foreground focus:outline-none rounded-none bg-white font-medium text-foreground"
                >
                  <option value="screen">Screen Replacement ({100 - selectedSub.screenCopay}% off GHS 1k limit)</option>
                  <option value="battery">Battery Replacement ({selectedSub.batteryDiscount}% off GHS 1k limit)</option>
                  <option value="charging_port">Charging Port Service ({selectedSub.chargingFreeCount > 0 ? "Free Plan" : "15% off"})</option>
                  <option value="back_glass">Back Glass Repair ({selectedSub.backGlassDiscount}% off)</option>
                  <option value="other">Other repairs / Diagnostics</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Repair Part Cost (GHS)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    placeholder="Enter raw part cost"
                    value={partCost}
                    onChange={(e) => setPartCost(e.target.value)}
                    className="w-full border border-border px-3 py-2 text-xs focus:border-foreground focus:outline-none rounded-none font-mono font-semibold"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-muted-foreground">GHS</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  * Note: If parts cost exceeds GH₵ 1,000, customer pays the difference in full.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Technician Notes / Details
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe details e.g. Replaced iPhone 14 Pro Max display..."
                  className="w-full border border-border px-3 py-2 text-xs focus:border-foreground focus:outline-none rounded-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSub(null)}
                  className="rounded-none text-xs font-semibold uppercase tracking-wider px-4 py-2 h-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold uppercase tracking-wider px-5 py-2 h-auto"
                >
                  {loading && <RefreshCw className="size-3 animate-spin mr-1.5" />}
                  Confirm Claim
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div className="space-y-4 pt-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Care Packages Config Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Adjust the public storefront pricing and names of the protection subscription plans.</p>
        </div>

        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-[#fcfcfc] text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Plan Name</th>
                <th className="p-3.5">Identifier</th>
                <th className="p-3.5 font-mono">Monthly Price</th>
                <th className="p-3.5">Screen Limit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3.5 font-bold text-foreground">{tier.name}</td>
                  <td className="p-3.5 font-mono text-muted-foreground">{tier.slug}</td>
                  <td className="p-3.5 font-bold font-mono text-foreground">{formatPrice(tier.price)}</td>
                  <td className="p-3.5 text-muted-foreground">{tier.screen_limit} Claim(s)/yr</td>
                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingTier(tier);
                        setTierName(tier.name);
                        setTierPrice(tier.price.toString());
                      }}
                      className="rounded-none border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background text-[10px] px-2.5 py-1 h-auto font-bold"
                    >
                      Adjust Settings
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editing Settings Modal Dialog */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-border p-6 shadow-xl relative space-y-4">
            <button
              onClick={() => setEditingTier(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>

            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">Adjust Care Package Settings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update the public storefront name and monthly pricing configuration for this tier.
              </p>
            </div>

            <form onSubmit={handleUpdateTier} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Package Name
                </label>
                <input
                  type="text"
                  required
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full border border-border px-3 py-2 text-xs focus:border-foreground focus:outline-none rounded-none font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Monthly Price (GHS)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="Enter monthly subscription price"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    className="w-full border border-border px-3 py-2 text-xs focus:border-foreground focus:outline-none rounded-none font-mono font-semibold"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-muted-foreground">GHS</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTier(null)}
                  className="rounded-none text-xs font-semibold uppercase tracking-wider px-4 py-2 h-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold uppercase tracking-wider px-5 py-2 h-auto"
                >
                  {loading && <RefreshCw className="size-3 animate-spin mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
