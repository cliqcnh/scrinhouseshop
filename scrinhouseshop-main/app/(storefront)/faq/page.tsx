import type { Metadata } from "next";
import { FAQClient } from "./faq-client";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently Asked Questions about ScrinHouse smartphones, deliveries, repairs, and warranties.",
};

export default function FaqPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Find quick answers to common questions about buying phones, booking repairs, and warranty policies at ScrinHouse.
          </p>
        </div>

        <FAQClient />
      </div>
    </div>
  );
}
