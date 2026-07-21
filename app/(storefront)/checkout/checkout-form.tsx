"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/utils/format";
import { placeOrder, type DeliveryAddress } from "@/actions/checkout/place-order";
import type { AddressValues } from "@/actions/storefront/addresses";

const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
  "Northern", "Upper East", "Upper West", "Volta", "Oti",
  "Bono", "Bono East", "Ahafo", "North East", "Savannah",
  "Western North",
];

interface Props {
  defaultName: string;
  defaultPhone: string;
  userEmail: string;
  savedAddresses?: AddressValues[];
}

import { validateCoupon } from "@/actions/storefront/coupons";

export function CheckoutForm({ defaultName, defaultPhone, userEmail, savedAddresses = [] }: Props) {
  const router    = useRouter();
  const items     = useCartStore((s) => s.items);
  const subtotal  = useCartStore((s) => s.subtotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Promo Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await validateCoupon(couponInput, subtotal());
      if (!res.valid) {
        toast.error(res.error ?? "Invalid coupon code");
        return;
      }
      setAppliedCoupon({ code: res.couponCode!, discountAmount: res.discountAmount! });
      toast.success(`Coupon "${res.couponCode}" applied! Saved GH₵${res.discountAmount?.toFixed(2)}`);
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  // Default default values (pre-fills with default address if exists)
  const defaultAddress = savedAddresses.find(a => a.isDefault) ?? savedAddresses[0];

  // Form fields
  const [fullName, setFullName]   = useState(defaultAddress?.fullName ?? defaultName);
  const [phone, setPhone]         = useState(defaultAddress?.phone ?? defaultPhone);
  const [region, setRegion]       = useState(defaultAddress?.region ?? "");
  const [city, setCity]           = useState(defaultAddress?.city ?? "");
  const [landmark, setLandmark]   = useState(defaultAddress?.landmark ?? "");
  
  // Track selected address dropdown
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id ?? "new");

  // Installment Ghana Card Verification State
  const hasInstallment = items.some((i) => i.isInstallment);
  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [ghanaCardFrontUrl, setGhanaCardFrontUrl] = useState("");
  const [ghanaCardBackUrl, setGhanaCardBackUrl] = useState("");

  function handleAddressChange(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setFullName(defaultName);
      setPhone(defaultPhone);
      setRegion("");
      setCity("");
      setLandmark("");
    } else {
      const selected = savedAddresses.find((a) => a.id === id);
      if (selected) {
        setFullName(selected.fullName);
        setPhone(selected.phone);
        setRegion(selected.region);
        setCity(selected.city);
        setLandmark(selected.landmark ?? "");
      }
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <ShoppingBag className="size-10 text-muted-foreground/30" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">
          Your cart is empty.{" "}
          <Link href="/category/phones" className="underline underline-offset-4">
            Shop now
          </Link>
        </p>
      </div>
    );
  }

  function handleFileRead(file: File, setter: (val: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setter(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName || !phone || !region || !city) {
      setError("Please fill in all required delivery fields.");
      return;
    }

    if (hasInstallment) {
      if (!ghanaCardNumber || !ghanaCardFrontUrl || !ghanaCardBackUrl) {
        setError("Ghana Card Number and both Front & Back photos are required for installment payment.");
        return;
      }
    }

    setLoading(true);
    try {
      const address: DeliveryAddress = { fullName, phone, region, city, landmark: landmark || undefined };
      const installmentDetails = hasInstallment
        ? { ghanaCardNumber, ghanaCardFrontUrl, ghanaCardBackUrl }
        : undefined;

      const result = await placeOrder(items, address, installmentDetails);

      // If Paystack returned a hosted URL → redirect there
      if (result.authorizationUrl) {
        clearCart();
        window.location.href = result.authorizationUrl;
        return;
      }

      // No Paystack key configured (dev / test mode) → go to confirmation directly
      clearCart();
      router.push(`/order/${result.orderId}?ref=${result.paystackRef}&mock=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <form onSubmit={handleSubmit} className="mt-8 lg:grid lg:grid-cols-12 lg:gap-12">
      {/* ── Delivery details ─────────────────────────────────────────── */}
      <section className="lg:col-span-7 space-y-5">
        <h2 className="font-heading text-base font-semibold text-foreground">Delivery details</h2>

        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {savedAddresses.length > 0 && (
          <div className="space-y-1.5 border-b border-border pb-4">
            <label htmlFor="co-saved-addr" className={labelCls}>Saved Delivery Address</label>
            <select
              id="co-saved-addr"
              value={selectedAddressId}
              onChange={(e) => handleAddressChange(e.target.value)}
              className={inputCls}
            >
              <option value="new">-- Add / Enter new address --</option>
              {savedAddresses.map((addr) => (
                <option key={addr.id} value={addr.id}>
                  {addr.fullName} - {addr.phone} ({addr.city}, {addr.region} Region) {addr.isDefault ? "[Default]" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="co-name" className={labelCls}>Full name *</label>
            <input
              id="co-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Kofi Mensah"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="co-phone" className={labelCls}>Phone number *</label>
            <input
              id="co-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              placeholder="024 000 0000"
            />
          </div>

          <div>
            <label htmlFor="co-region" className={labelCls}>Region *</label>
            <select
              id="co-region"
              required
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputCls}
            >
              <option value="">Select region…</option>
              {GHANA_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="co-city" className={labelCls}>City / Area *</label>
            <input
              id="co-city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
              placeholder="Osu, Kumasi, etc."
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="co-landmark" className={labelCls}>
              Landmark / Street <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="co-landmark"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className={inputCls}
              placeholder="Near the blue gate, opposite Shoprite…"
            />
          </div>
        </div>

        {hasInstallment && (
          <div className="border border-border p-6 bg-[#fcfcfc] space-y-4 mt-8 rounded-none">
            <div className="border-b border-border pb-3">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">
                Ghana Card Verification (Required for Installments)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                To complete your 40% Deposit Hire Purchase order, please provide your Ghana Card details.
              </p>
            </div>

            <div>
              <label htmlFor="co-ghana-card-num" className={labelCls}>
                Ghana Card Number (PIN) *
              </label>
              <input
                id="co-ghana-card-num"
                type="text"
                required
                value={ghanaCardNumber}
                onChange={(e) => setGhanaCardNumber(e.target.value)}
                className={inputCls}
                placeholder="GHA-000000000-0"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-card-front" className={labelCls}>
                  Ghana Card Front Photo *
                </label>
                <input
                  id="co-card-front"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileRead(f, setGhanaCardFrontUrl);
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-none file:border file:border-border file:bg-white file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent cursor-pointer"
                />
                {ghanaCardFrontUrl && (
                  <div className="mt-2 text-[10px] text-green-600 font-semibold flex items-center gap-1">
                    ✓ Front card photo attached
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="co-card-back" className={labelCls}>
                  Ghana Card Back Photo *
                </label>
                <input
                  id="co-card-back"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileRead(f, setGhanaCardBackUrl);
                  }}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-none file:border file:border-border file:bg-white file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent cursor-pointer"
                />
                {ghanaCardBackUrl && (
                  <div className="mt-2 text-[10px] text-green-600 font-semibold flex items-center gap-1">
                    ✓ Back card photo attached
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Order summary ─────────────────────────────────────────────── */}
      <aside className="mt-10 lg:col-span-5 lg:mt-0">
        <div className="border border-border p-6 space-y-4">
          <h2 className="font-heading text-base font-semibold text-foreground">Order summary</h2>

          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#f7f7f7]">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill sizes="56px" className="object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="size-5 text-muted-foreground/30" strokeWidth={1} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Promo Coupon Box */}
          <div className="border-t border-border pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="PROMO CODE (e.g. WELCOME50)"
                className="flex-1 border border-border px-3 py-1.5 text-xs focus:border-foreground focus:outline-none rounded-none uppercase font-mono font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                disabled={couponLoading || !couponInput}
                onClick={handleApplyCoupon}
                className="rounded-none text-xs px-3 py-1.5 h-auto font-semibold border-border"
              >
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 text-xs text-green-600 font-semibold flex items-center justify-between">
                <span>✓ Coupon {appliedCoupon.code} applied</span>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="text-[10px] text-muted-foreground underline hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-sm border-t border-border pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal())}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-green-700 font-semibold">
                <span>Discount ({appliedCoupon.code})</span>
                <span>-{formatPrice(appliedCoupon.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-muted-foreground">To be confirmed</span>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex justify-between text-sm font-semibold text-foreground">
            <span>Total</span>
            <span>{formatPrice(Math.max(0, subtotal() - (appliedCoupon?.discountAmount ?? 0)))}</span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-none"
            disabled={loading}
          >
            {loading ? "Processing…" : "Pay with Paystack"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Ordering as{" "}
            <span className="font-medium text-foreground">{userEmail}</span>
          </p>
        </div>
      </aside>
    </form>
  );
}
