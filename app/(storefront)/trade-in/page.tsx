import type { Metadata } from "next";
import { TradeInCalculator } from "./trade-in-calculator";

export const metadata: Metadata = {
  title: "Trade-In & Phone Swap Calculator",
  description: "Get an instant trade-in valuation estimate for your smartphone and swap for credit or cash at ScrinHouse GH.",
};

export default function TradeInPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Trade-In &amp; Phone Swap
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Turn your used iPhone or Samsung into instant credit towards buying a new device or repair service at ScrinHouse.
          </p>
        </div>

        <TradeInCalculator />
      </div>
    </div>
  );
}
