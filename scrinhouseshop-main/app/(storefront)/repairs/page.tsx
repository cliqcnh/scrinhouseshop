import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Smartphone, BatteryCharging, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Repair Service" };

const REPAIR_SERVICES = [
  {
    icon: Smartphone,
    title: "Screen Replacement",
    desc: "Shattered glass, bleeding LCD, or unresponsive touch? We fit original OEM screens with true-tone calibration.",
    priceTag: "Model-specific estimate applies",
  },
  {
    icon: BatteryCharging,
    title: "Battery Replacement",
    desc: "Battery draining fast or phone shut down at 20%? Restore 100% health with zero-cycle original spec batteries.",
    priceTag: "Estimates starting from GHS 450",
  },
  {
    icon: Wrench,
    title: "Charging Port & Logic Board",
    desc: "Phone refusing to charge, loose charging cable, or diagnostic issues? Fast USB-C & Lightning port repairs.",
    priceTag: "Estimated after diagnosis",
  },
  {
    icon: ShieldAlert,
    title: "Liquid Damage & Diagnosis",
    desc: "Dropped in water? We run chemical ultrasonic bath treatments to scrub motherboard corrosion.",
    priceTag: "Flat diagnostic fee of GHS 150",
  },
];

const ADVANTAGES = [
  "OEM-grade high quality replacement parts",
  "180-day warranty on all screens & battery repairs",
  "Doorstep pickup & delivery across Greater Accra & Kumasi",
  "Certified technicians specialized in Apple & Samsung logic boards",
];

export default function RepairsPage() {
  return (
    <div className="bg-white">
      {/* Hero Banner section */}
      <section className="relative border-b border-border bg-[#f8f8f8] py-20 text-center px-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <Wrench className="size-10 mx-auto text-foreground" strokeWidth={1.5} />
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Phone Repair Services
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get your cracked screen, battery swap, or logic board repairs completed by certified ScrinHouse technicians. Enjoy upfront estimated pricing and live tracking.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Button size="lg" className="rounded-none" render={<Link href="/repairs/book" />}>
              Book a Repair <ChevronRight className="ml-1 size-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-none border-border" render={<Link href="/track" />}>
              Track Existing Repair
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="font-heading text-2xl font-bold text-foreground">Common phone fixes</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Select one of our popular services in the booking form to see your model&apos;s instant estimate.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {REPAIR_SERVICES.map((s, idx) => (
            <div key={idx} className="border border-border p-6 flex gap-4 items-start bg-background">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-foreground">
                <s.icon className="size-5" />
              </span>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-sm text-foreground">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                <span className="inline-block text-[10px] uppercase font-bold text-foreground mt-2 bg-[#f0f0f0] px-2 py-0.5">
                  {s.priceTag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Advantage banner */}
      <section className="border-t border-border bg-[#f8f8f8] py-16 px-4">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <h2 className="font-heading text-xl font-bold text-foreground">Why repair with ScrinHouse?</h2>
          <ul className="grid gap-3 sm:grid-cols-2 text-left text-sm max-w-2xl mx-auto pt-2">
            {ADVANTAGES.map((adv, idx) => (
              <li key={idx} className="flex gap-2 items-start text-muted-foreground leading-snug">
                <CheckCircle2 className="size-4 shrink-0 text-foreground mt-0.5" />
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
