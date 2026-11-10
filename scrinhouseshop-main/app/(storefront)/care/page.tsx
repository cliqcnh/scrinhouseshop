import type { Metadata } from "next";
import Link from "next/link";
import { Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/utils/format";

interface CareTier {
  id: string;
  name: string;
  slug: string;
  price: number;
  screen_limit: number;
  screen_copay_percentage: number;
  battery_discount: number;
  charging_port_free_count: number;
  back_glass_discount: number;
  is_active: boolean;
}

export const metadata: Metadata = {
  title: "ScrinHouse Care - Phone Protection Subscription",
  description: "Subscribe monthly to protect your smartphone with screen coverage, battery discounts, and priority repair support.",
};

export default async function CarePage() {
  const supabase = await createClient();
  const { data: tiers } = await supabase
    .from("care_tiers")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  const displayTiers = tiers ?? [];

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Phone Protection Subscription
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Don&apos;t wait for your phone screen to break. Subscribe monthly and enjoy premium screen coverage, battery/port discounts, free diagnostics, and priority service.
          </p>
        </div>

        {/* Pricing Cards */}
        {displayTiers.length === 0 ? (
          <div className="border border-border p-12 text-center text-sm text-muted-foreground bg-muted/10 max-w-lg mx-auto">
            ScrinHouse Care plans are currently being configured. Please check back shortly.
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 items-stretch mb-16">
            {displayTiers.map((tier: CareTier) => {
              // Custom gradient headers for visual elegance
              const isBusiness = tier.slug === "care-business";
              const isRider = tier.slug === "rider-care";
              const headerBg = isBusiness 
                ? "bg-foreground text-background" 
                : isRider
                ? "bg-blue-50 text-blue-900 border-b border-blue-100"
                : "bg-muted/30 text-foreground border-b border-border/60";

              return (
                <div key={tier.id} className="flex flex-col border border-border bg-white rounded-none hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className={`p-6 ${headerBg} flex-none space-y-1`}>
                    <h3 className="font-heading text-lg font-bold">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold">{formatPrice(tier.price)}</span>
                      <span className="text-xs opacity-80">/ month</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <ul className="space-y-3.5 text-xs text-muted-foreground">
                      <li className="flex gap-2 items-start text-foreground font-semibold">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" strokeWidth={3} />
                        <span>
                          {tier.screen_limit} Screen Claim{tier.screen_limit > 1 ? "s" : ""}/yr ({100 - Number(tier.screen_copay_percentage)}% Covered)
                        </span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{tier.battery_discount}% Off Battery Replacements</span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>
                          {Number(tier.charging_port_free_count) > 0 
                            ? `${tier.charging_port_free_count} Free Port Service/yr` 
                            : "15% Off Charging Port Service"}
                        </span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{tier.back_glass_discount}% Off Back Glass Repairs</span>
                      </li>
                      <li className="flex gap-2 items-start">
                        <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                        <span>Free Diagnostics &amp; Priority Repairs</span>
                      </li>
                    </ul>

                    <Link
                      href={`/care/subscribe/${tier.id}`}
                      className={`inline-flex items-center justify-center w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors rounded-none text-center ${
                        isBusiness 
                          ? "bg-foreground text-background hover:bg-foreground/90" 
                          : "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background"
                      }`}
                    >
                      Subscribe Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Protection Terms Alert Panel */}
        <div className="max-w-4xl mx-auto border border-border p-6 bg-muted/10 space-y-6">
          <div className="flex gap-2.5 items-start text-foreground font-bold">
            <AlertCircle className="size-5 text-foreground shrink-0 mt-0.5" />
            <h4 className="font-heading uppercase tracking-wider text-sm">Subscription Terms &amp; Anti-Fraud Limits</h4>
          </div>
          <div className="grid gap-6 sm:grid-cols-3 text-xs text-muted-foreground leading-relaxed">
            <div className="space-y-1">
              <span className="block font-bold text-foreground">1. 2-Month Wait Period</span>
              <span>To ensure fair coverage and prevent instant claim fraud, screen and hardware claim coverage begins exactly **60 days** after your plan payment.</span>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-foreground">2. GH₵ 1,000 Part Limit</span>
              <span>ScrinHouse Care covers parts cost up to **GH₵ 1,000**. For expensive premium parts exceeding this, the subscriber pays only the excess difference.</span>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-foreground">3. IMEI/Serial Locked</span>
              <span>Each plan is registered to one specific device IMEI or serial number, which is validated in our workshop at the time of claim check-in.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
