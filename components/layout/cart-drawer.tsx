"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { formatPrice } from "@/utils/format";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const items        = useCartStore((s) => s.items);
  const removeItem   = useCartStore((s) => s.removeItem);
  const updateQty    = useCartStore((s) => s.updateQuantity);
  const totalItems   = useCartStore((s) => s.totalItems);
  const subtotal     = useCartStore((s) => s.subtotal);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="font-heading text-lg font-bold">
            Cart ({totalItems()})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-6">
            <ShoppingBag className="size-10 text-muted-foreground/40" strokeWidth={1} />
            <p className="text-sm font-medium text-foreground">Your cart is empty</p>
            <p className="text-xs text-muted-foreground">
              Browse our catalog and add something you love.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 rounded-none"
              onClick={() => onOpenChange(false)}
              render={<Link href="/category/phones" />}
            >
              Shop now
            </Button>
          </div>
        ) : (
          <>
            {/* Item list */}
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6 py-2">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-4">
                  {/* Image */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f7f7f7]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="size-6 text-muted-foreground/40" strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity + remove */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center text-foreground transition-colors hover:bg-muted"
                          onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label="Remove item"
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => removeItem(item.variantId)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="border-t border-border p-6 space-y-4 bg-background">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(subtotal())}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Delivery calculated at checkout.
              </p>
              <Button
                size="lg"
                className="w-full rounded-none"
                onClick={() => onOpenChange(false)}
                render={<Link href="/checkout" />}
              >
                Checkout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-none"
                onClick={() => onOpenChange(false)}
                render={<Link href="/cart" />}
              >
                View full cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
