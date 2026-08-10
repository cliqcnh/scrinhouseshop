"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDeliveryConfig, type DeliveryConfig } from "@/actions/admin/installments";

export function DeliverySettingsCard({ initialConfig }: { initialConfig: DeliveryConfig }) {
  const [loading, setLoading] = useState(false);
  const [phonesAccra, setPhonesAccra] = useState(initialConfig.phones_accra);
  const [phonesOutside, setPhonesOutside] = useState(initialConfig.phones_outside);
  const [consolesAccra, setConsolesAccra] = useState(initialConfig.consoles_accra);
  const [consolesOutside, setConsolesOutside] = useState(initialConfig.consoles_outside);
  const [othersAccra, setOthersAccra] = useState(initialConfig.others_accra);
  const [othersOutside, setOthersOutside] = useState(initialConfig.others_outside);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (
      phonesAccra < 0 ||
      phonesOutside < 0 ||
      consolesAccra < 0 ||
      consolesOutside < 0 ||
      othersAccra < 0 ||
      othersOutside < 0
    ) {
      toast.error("Please enter valid positive numbers for shipping rates.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveDeliveryConfig({
        phones_accra: Number(phonesAccra),
        phones_outside: Number(phonesOutside),
        consoles_accra: Number(consolesAccra),
        consoles_outside: Number(consolesOutside),
        others_accra: Number(othersAccra),
        others_outside: Number(othersOutside),
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to update delivery rates");
        return;
      }
      toast.success("Delivery rates updated successfully!");
    } catch {
      toast.error("An error occurred while updating settings.");
    } finally {
      setLoading(false);
    }
  }

  const labelCls = "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2";
  const inputWrapperCls = "relative";
  const inputCls = "w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none rounded-none pl-8 font-mono";

  return (
    <form onSubmit={handleSave} className="border border-border p-6 bg-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Truck className="size-4 text-foreground" /> Delivery Pricing & Rates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure shipping fees for Phones, Consoles, and all other items based on the delivery region.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-2">
        {/* Phones Section */}
        <div className="space-y-4 border border-border p-4 bg-muted/5">
          <h3 className="text-xs font-bold uppercase text-foreground border-b border-border pb-2">1. Phones / Devices</h3>
          <div>
            <label htmlFor="del-phones-accra" className={labelCls}>Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-phones-accra"
                type="number"
                min="0"
                step="0.5"
                value={phonesAccra}
                onChange={(e) => setPhonesAccra(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="del-phones-outside" className={labelCls}>Outside Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-phones-outside"
                type="number"
                min="0"
                step="0.5"
                value={phonesOutside}
                onChange={(e) => setPhonesOutside(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>

        {/* Consoles Section */}
        <div className="space-y-4 border border-border p-4 bg-muted/5">
          <h3 className="text-xs font-bold uppercase text-foreground border-b border-border pb-2">2. Game Consoles</h3>
          <div>
            <label htmlFor="del-consoles-accra" className={labelCls}>Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-consoles-accra"
                type="number"
                min="0"
                step="0.5"
                value={consolesAccra}
                onChange={(e) => setConsolesAccra(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="del-consoles-outside" className={labelCls}>Outside Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-consoles-outside"
                type="number"
                min="0"
                step="0.5"
                value={consolesOutside}
                onChange={(e) => setConsolesOutside(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>

        {/* Others Section */}
        <div className="space-y-4 border border-border p-4 bg-muted/5">
          <h3 className="text-xs font-bold uppercase text-foreground border-b border-border pb-2">3. Others (Accessories / Parts)</h3>
          <div>
            <label htmlFor="del-others-accra" className={labelCls}>Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-others-accra"
                type="number"
                min="0"
                step="0.5"
                value={othersAccra}
                onChange={(e) => setOthersAccra(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="del-others-outside" className={labelCls}>Outside Accra Delivery (GHS)</label>
            <div className={inputWrapperCls}>
              <span className="absolute left-3 top-2 text-sm text-muted-foreground font-semibold">GH₵</span>
              <input
                id="del-others-outside"
                type="number"
                min="0"
                step="0.5"
                value={othersOutside}
                onChange={(e) => setOthersOutside(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-bold text-xs uppercase tracking-wider gap-2 px-6 py-2.5 h-auto"
          disabled={loading}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Delivery Rates
        </Button>
      </div>
    </form>
  );
}
