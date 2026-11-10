import type { Metadata } from "next";
import Link from "next/link";
import { Truck, Wrench, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Doorstep Repair & Pickup Service",
  description: "Book a hassle-free doorstep phone repair pickup in Ghana. We collect, repair with genuine parts, and deliver back to you.",
};

export default function DoorstepPickupPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 border border-border bg-[#fcfcfc] px-3 py-1 text-xs font-bold uppercase tracking-wider text-foreground mb-4">
            <Truck className="size-3.5" /> Doorstep Express Repair
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Doorstep Pickup &amp; Return Repair Service
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            No need to travel across town. We collect your broken phone from your home or office, repair it at our expert workshop, and deliver it back to your doorstep.
          </p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/repairs/book">
              <Button size="lg" className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-bold uppercase tracking-wider gap-2">
                Book Doorstep Pickup <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/track">
              <Button size="lg" variant="outline" className="rounded-none border-border text-xs font-bold uppercase tracking-wider">
                Track Active Repair
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Step Process Grid */}
        <div className="mt-20 border-t border-border pt-16">
          <h2 className="font-heading text-2xl font-bold text-center mb-12">How Doorstep Pickup Works</h2>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-border p-6 bg-[#fcfcfc] space-y-3 relative">
              <span className="text-xs font-mono font-bold text-muted-foreground">01 / BOOK</span>
              <h3 className="font-heading text-base font-bold text-foreground">1. Book Online</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your device model, select the repair type (Screen, Battery, Port), and pick the &quot;Doorstep Pickup&quot; option.
              </p>
            </div>

            <div className="border border-border p-6 bg-[#fcfcfc] space-y-3 relative">
              <span className="text-xs font-mono font-bold text-muted-foreground">02 / PICKUP</span>
              <h3 className="font-heading text-base font-bold text-foreground">2. Courier Collects</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our assigned dispatch rider collects your device directly from your home or office address anywhere in Ghana.
              </p>
            </div>

            <div className="border border-border p-6 bg-[#fcfcfc] space-y-3 relative">
              <span className="text-xs font-mono font-bold text-muted-foreground">03 / REPAIR</span>
              <h3 className="font-heading text-base font-bold text-foreground">3. Expert Repair</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Certified technicians repair your device using Grade-A OEM parts and perform comprehensive multi-point quality checks.
              </p>
            </div>

            <div className="border border-border p-6 bg-[#fcfcfc] space-y-3 relative">
              <span className="text-xs font-mono font-bold text-muted-foreground">04 / RETURN</span>
              <h3 className="font-heading text-base font-bold text-foreground">4. Delivered Back</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your fully repaired device is packaged and delivered straight back to your hands with an official service warranty.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-20 border border-border p-8 sm:p-12 bg-white">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground">Warranty Covered</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Every doorstep repair comes with a 90-day ScrinHouse service warranty covering parts and workmanship.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <Wrench className="size-5" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground">Genuine OEM Parts</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We use original screens, high-capacity batteries, and premium charging flex cables for maximum longevity.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground">Live Tracking</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Monitor your repair status live from pickup, diagnostic evaluation, to final doorstep return delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
