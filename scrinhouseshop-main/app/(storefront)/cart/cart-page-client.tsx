"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/utils/format";

const DELIVERY_FEE = 0; // displayed as "calculated at checkout"

export function CartPageClient() {
  const items      = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty  = useCartStore((s) => s.updateQuantity);
  const subtotal   = useCartStore((s) => s.subtotal);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="size-12 text-muted-foreground/30" strokeWidth={1} />
        <h1 className="font-heading text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Looks like you haven&apos;t added anything yet. Browse our catalog to get started.
        </p>
        <Button className="mt-2 rounded-none" render={<Link href="/category/phones" />}>
          Shop phones
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Cart</h1>

      <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-10">
        {/* ── Item list ─────────────────────────────────────────────── */}
        <section className="lg:col-span-8">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-5 py-6">
                {/* Thumbnail */}
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#f7f7f7] sm:h-28 sm:w-28">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="(min-width: 640px) 112px, 96px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="size-8 text-muted-foreground/30" strokeWidth={1} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>

                  {/* Qty stepper + remove */}
                  <div className="mt-auto flex items-center gap-4">
                    <div className="flex items-center border border-border">
                      <button
                        type="button"
                        aria-label="Decrease"
                        disabled={item.quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-muted disabled:opacity-40"
                        onClick={() => updateQty(item.variantId, item.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-muted"
                        onClick={() => updateQty(item.variantId, item.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label="Remove"
                      className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
                      onClick={() => removeItem(item.variantId)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-4">
            <Link
              href="/category/phones"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Continue shopping
            </Link>
          </div>
        </section>

        {/* ── Order summary ──────────────────────────────────────────── */}
        <aside className="mt-10 lg:col-span-4 lg:mt-0">
          <div className="border border-border p-6 space-y-4">
            <h2 className="font-heading text-base font-semibold text-foreground">Order summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between text-sm font-semibold text-foreground">
              <span>Estimated total</span>
              <span>{formatPrice(subtotal() + DELIVERY_FEE)}</span>
            </div>

            <Button
              size="lg"
              className="w-full rounded-none"
              render={<Link href="/checkout" />}
            >
              Proceed to checkout
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Secure payment via Paystack
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
