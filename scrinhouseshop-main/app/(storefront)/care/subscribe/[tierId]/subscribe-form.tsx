"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format";
import { subscribeToCarePlan } from "@/actions/storefront/care";

interface Props {
  tier: {
    id: string;
    name: string;
    price: number;
    screen_limit: number;
    screen_copay_percentage: number;
  };
}

export function SubscribeForm({ tier }: Props) {
  const [deviceModel, setDeviceModel] = useState("");
  const [imeiSerial, setImeiSerial] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceModel.trim()) {
      toast.error("Please enter your device model.");
      return;
    }
    if (!imeiSerial.trim()) {
      toast.error("Please enter your device IMEI or Serial number.");
      return;
    }

    setLoading(true);
    try {
      const res = await subscribeToCarePlan({
        tierId: tier.id,
        deviceModel,
        imeiSerial,
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to initialize subscription checkout");
        return;
      }

      if (res.authorizationUrl) {
        toast.success("Redirecting to Paystack to complete payment...");
        window.location.href = res.authorizationUrl;
      } else {
        toast.success("Subscription request submitted! Waiting for manual approval.");
      }
    } catch {
      toast.error("An error occurred during checkout initialization.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:items-start max-w-5xl mx-auto">
      {/* Checkout Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6 border border-border p-6 sm:p-8 bg-white">
        <h2 className="font-heading text-xl font-bold text-foreground pb-4 border-b border-border">
          Device Registration
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="sub-model" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Device Model *
            </label>
            <input
              id="sub-model"
              type="text"
              required
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none rounded-none"
              placeholder="e.g. iPhone 14 Pro Max"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Specify exact brand and model to avoid claims issues.</p>
          </div>

          <div>
            <label htmlFor="sub-imei" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              IMEI or Serial Number *
            </label>
            <input
              id="sub-imei"
              type="text"
              required
              value={imeiSerial}
              onChange={(e) => setImeiSerial(e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none rounded-none font-mono"
              placeholder="e.g. 357124098765432"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Dial *#06# on your phone to find your IMEI.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-bold uppercase tracking-wider gap-2 py-3 h-auto"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            Pay &amp; Activate Plan — {formatPrice(tier.price)}
          </Button>
        </div>
      </form>

      {/* Summary Sidebar */}
      <aside className="lg:col-span-5 border border-border p-6 bg-white space-y-6">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Summary</span>
          <h3 className="font-heading text-lg font-bold text-foreground mt-1">{tier.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">Recurrent Monthly Subscription</p>
        </div>

        <div className="border-t border-b border-border py-4 space-y-2.5 font-mono text-xs">
          <div className="flex justify-between">
            <span>Billing Interval</span>
            <span>Monthly</span>
          </div>
          <div className="flex justify-between font-bold text-foreground">
            <span>First Month Price</span>
            <span>{formatPrice(tier.price)}</span>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-muted-foreground leading-relaxed">
          <div className="flex gap-2 items-start text-foreground font-semibold">
            <ShieldCheck className="size-4 text-foreground shrink-0 mt-0.5" />
            <span>Plan Rules:</span>
          </div>
          <ul className="list-disc list-inside space-y-2 pl-1">
            <li><strong>60-Day Waiting Window:</strong> Claim coverage begins after two months of active status.</li>
            <li><strong>GH₵ 1,000 Max Parts:</strong> Parts cost up to GH₵ 1,000 covered. You pay only the difference if parts cost more.</li>
            <li><strong>Copay:</strong> Repaired screen co-payment is {tier.screen_copay_percentage}% of covered value.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
