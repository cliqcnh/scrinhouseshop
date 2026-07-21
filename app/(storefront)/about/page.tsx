import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about ScrinHouse GH, Ghana's premier online store for smartphones and repairs.",
};

export default function AboutPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            About ScrinHouse
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Ghana&apos;s premier online marketplace for brand new and UK-used smartphones, quality accessories, and professional doorstep device repairs.
          </p>
        </div>

        <div className="mt-16 border-t border-border pt-12">
          <div className="grid gap-12 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center border border-border bg-[#fcfcfc] text-foreground mb-4 rounded-none">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-bold">100% Genuine Devices</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Every phone in our catalog undergoes multi-point testing by expert technicians to verify serial matching and hardware integrity.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center border border-border bg-[#fcfcfc] text-foreground mb-4 rounded-none">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-bold">Quality-Assured Repairs</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                We only use grade-A replacement parts for our screen, battery, and port repairs, backed by comprehensive service warranties.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center border border-border bg-[#fcfcfc] text-foreground mb-4 rounded-none">
                <Heart className="size-6" />
              </div>
              <h3 className="font-heading text-lg font-bold">Doorstep Convenience</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Book a repair online, choose our pickup & return option, and monitor your device diagnostics through your real-time dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-border pt-16 max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-center mb-6">Our Mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            To provide Ghanaian tech enthusiasts with a trusted, transparent, and seamless online shopping experience for mobile devices and repairs. By eliminating the guess-work from purchasing UK-used smartphones and scheduling repairs, we make top-tier customer service accessible directly from your home.
          </p>
        </div>
      </div>
    </div>
  );
}
