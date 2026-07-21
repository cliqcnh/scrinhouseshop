"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Percent, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveInstallmentConfig } from "@/actions/admin/installments";
import type { InstallmentConfig } from "@/lib/installments";

export function InstallmentSettingsCard({ initialConfig }: { initialConfig: InstallmentConfig }) {
  const [loading, setLoading] = useState(false);
  const [profitPercentage, setProfitPercentage] = useState(initialConfig.profitPercentage);
  const [depositPercentage, setDepositPercentage] = useState(initialConfig.depositPercentage);
  const [isEnabled, setIsEnabled] = useState(initialConfig.isEnabled ?? true);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (profitPercentage < 0 || depositPercentage <= 0 || depositPercentage > 100) {
      toast.error("Please enter valid percentage values (Deposit must be between 1% and 100%).");
      return;
    }

    setLoading(true);
    try {
      const res = await saveInstallmentConfig({
        profitPercentage: Number(profitPercentage),
        depositPercentage: Number(depositPercentage),
        isEnabled,
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to update rates");
        return;
      }
      toast.success("Installment plan rates updated successfully!");
    } catch {
      toast.error("An error occurred while updating settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="border border-border p-6 bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Percent className="size-4 text-foreground" /> Installment Rates & Configuration
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure the default profit markup and required down-payment deposit for smartphone hire purchases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="size-4 rounded border-border text-foreground focus:ring-foreground"
            />
            Enable Installments on Storefront
          </label>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-end pt-2">
        <div>
          <label htmlFor="cfg-profit" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Plan Profit Markup (%)
          </label>
          <div className="relative">
            <input
              id="cfg-profit"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={profitPercentage}
              onChange={(e) => setProfitPercentage(Number(e.target.value))}
              className="w-full border border-border px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none rounded-none pr-8 font-mono"
              required
            />
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Interest added to base price (e.g. 20%)</p>
        </div>

        <div>
          <label htmlFor="cfg-deposit" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Down Payment Deposit (%)
          </label>
          <div className="relative">
            <input
              id="cfg-deposit"
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={depositPercentage}
              onChange={(e) => setDepositPercentage(Number(e.target.value))}
              className="w-full border border-border px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none rounded-none pr-8 font-mono"
              required
            />
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Required down payment today (e.g. 40%)</p>
        </div>

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold uppercase tracking-wider gap-2 py-2.5 h-auto"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Rate Settings
          </Button>
        </div>
      </div>
    </form>
  );
}
