"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/format";
import { calculateTradeInValue } from "@/lib/trade-in";
import { submitTradeInRequest } from "@/actions/storefront/trade-in";

const MODELS = {
  Apple: [
    "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
    "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
    "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
    "iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max",
    "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max",
  ],
  Samsung: ["Galaxy S21", "Galaxy S22", "Galaxy S23", "Galaxy S24"],
};

export function TradeInCalculator() {
  const [brand, setBrand] = useState<"Apple" | "Samsung">("Apple");
  const [model, setModel] = useState<string>(MODELS["Apple"][0]);
  const [storage, setStorage] = useState("128GB");
  const [screenCondition, setScreenCondition] = useState<"flawless" | "scratched" | "cracked">("flawless");
  const [bodyCondition, setBodyCondition] = useState<"clean" | "light_wear" | "heavy_wear">("clean");
  const [batteryHealth, setBatteryHealth] = useState<"good" | "below_80">("good");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const estimatedValue = calculateTradeInValue({
    brand,
    model,
    storage,
    screenCondition,
    bodyCondition,
    batteryHealth,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactPhone) {
      toast.error("Please enter your contact phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitTradeInRequest({
        brand,
        model,
        storage,
        screenCondition,
        bodyCondition,
        batteryHealth,
        contactPhone,
        notes,
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to submit trade-in request");
        return;
      }

      setSubmittedId(res.requestId ?? "submitted");
      toast.success("Trade-in request submitted successfully!");
    } catch {
      toast.error("An error occurred submitting your trade-in evaluation.");
    } finally {
      setLoading(false);
    }
  }

  if (submittedId) {
    return (
      <div className="border border-border p-8 sm:p-12 text-center bg-white space-y-6 max-w-2xl mx-auto">
        <div className="flex size-14 mx-auto items-center justify-center bg-green-50 text-green-600 rounded-full">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="font-heading text-2xl font-bold text-foreground">Trade-In Submitted for Admin Valuation!</h2>
          <p className="text-sm text-muted-foreground">
            Thank you! Your device specs (<strong className="text-foreground">{brand} {model}</strong>) have been sent to our admin team for evaluation.
          </p>
          <p className="text-xs text-muted-foreground pt-2">
            Request Reference: <span className="font-mono font-semibold text-foreground">{submittedId}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Our valuation team will inspect your device condition and call/WhatsApp your number (<span className="font-mono text-foreground font-semibold">{contactPhone}</span>) shortly with your official trade-in quote.
          </p>
        </div>
        <Button
          onClick={() => setSubmittedId(null)}
          variant="outline"
          className="rounded-none text-xs font-semibold uppercase tracking-wider"
        >
          Submit Another Device
        </Button>
      </div>
    );
  }

  const labelCls = "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2";
  const btnGroupCls = (active: boolean) =>
    `border p-3 text-xs font-semibold transition-colors rounded-none text-left ${
      active ? "border-foreground bg-foreground text-background" : "border-border bg-white text-foreground hover:border-foreground/40"
    }`;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
      {/* Questionnaire Form */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6 border border-border p-6 sm:p-8 bg-white">
        <div>
          <label className={labelCls}>1. Select Brand</label>
          <div className="grid grid-cols-2 gap-3">
            {(["Apple", "Samsung"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBrand(b);
                  setModel(MODELS[b][0]);
                }}
                className={btnGroupCls(brand === b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ti-model" className={labelCls}>2. Select Phone Model</label>
          <select
            id="ti-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border border-border px-3 py-2.5 text-sm focus:border-foreground focus:outline-none rounded-none bg-white font-medium"
          >
            {MODELS[brand].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>3. Storage Capacity</label>
          <div className="grid grid-cols-4 gap-2">
            {["64GB", "128GB", "256GB", "512GB"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStorage(st)}
                className={btnGroupCls(storage === st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>4. Display &amp; Screen Condition</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "flawless", label: "Flawless", sub: "No scratches" },
              { id: "scratched", label: "Minor Scratches", sub: "Light surface marks" },
              { id: "cracked", label: "Cracked Screen", sub: "Cracks or dead pixels" },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScreenCondition(sc.id as any)}
                className={btnGroupCls(screenCondition === sc.id)}
              >
                <div className="font-semibold">{sc.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{sc.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>5. Body Condition</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "clean", label: "Clean / Like New" },
              { id: "light_wear", label: "Light Wear / Scuffs" },
              { id: "heavy_wear", label: "Heavy Wear / Dents" },
            ].map((bc) => (
              <button
                key={bc.id}
                type="button"
                onClick={() => setBodyCondition(bc.id as any)}
                className={btnGroupCls(bodyCondition === bc.id)}
              >
                {bc.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>6. Battery Health</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "good", label: "Good Health (>80%)" },
              { id: "below_80", label: "Degraded (<80% or Service)" },
            ].map((bh) => (
              <button
                key={bh.id}
                type="button"
                onClick={() => setBatteryHealth(bh.id as any)}
                className={btnGroupCls(batteryHealth === bh.id)}
              >
                {bh.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">Contact &amp; Swap Details</h3>
          
          <div>
            <label htmlFor="ti-phone" className={labelCls}>Your Phone Number *</label>
            <input
              id="ti-phone"
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
              placeholder="024 000 0000"
            />
          </div>

          <div>
            <label htmlFor="ti-notes" className={labelCls}>Additional Details / Target Swap Model <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              id="ti-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none resize-none"
              placeholder="e.g. I want to swap this iPhone 12 for an iPhone 14 Pro..."
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs font-bold uppercase tracking-wider gap-2 py-3 h-auto"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Submit Device for Admin Trade-In Quote
          </Button>
        </div>
      </form>

      {/* Valuation Summary Card */}
      <aside className="lg:col-span-5 sticky top-8 space-y-6">
        <div className="border border-border p-6 bg-white space-y-6">
          <div className="border-b border-border pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Valuation Process</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-heading text-xl font-bold text-foreground">Personalized Quote</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5">
                Admin Evaluated
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Selected: <strong className="text-foreground">{brand} {model} ({storage})</strong> in <strong className="text-foreground">{screenCondition}</strong> condition.
            </p>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex gap-2 items-start text-foreground font-semibold">
              <ShieldCheck className="size-4 text-foreground shrink-0 mt-0.5" />
              <span>How Admin Trade-In Works:</span>
            </div>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li>Submit your device details and specs above.</li>
              <li>ScrinHouse admin team reviews your phone condition and calculates a custom valuation quote.</li>
              <li>Our team calls/whatsapps you with your official cash payout or store credit offer.</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}
