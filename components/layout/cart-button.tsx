"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { useCartStore } from "@/stores/cart";

/**
 * Client-side island that renders the cart icon + badge and owns the CartDrawer.
 * Mounted inside the server-rendered Header so the rest of the nav stays RSC.
 */
export function CartButton() {
  const [cartOpen, setCartOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems);
  const count = totalItems();

  // Listen for the "open-cart" custom event dispatched by AddToCartPanel toast
  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener("open-cart", handler);
    return () => window.removeEventListener("open-cart", handler);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Cart${count > 0 ? ` (${count} items)` : ""}`}
        className="relative"
        onClick={() => setCartOpen(true)}
      >
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold leading-none text-background">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
