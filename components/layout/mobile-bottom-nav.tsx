"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid3X3,
  Flame,
  ShoppingBag,
  User,
  Wrench,
  RefreshCw,
  Shield,
  Truck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { CartDrawer } from "@/components/layout/cart-drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MobileBottomNavProps {
  categories?: Category[];
  displayName?: string | null;
}

const QUICK_FEATURE_LINKS = [
  { label: "🔥 Market Days", href: "/market-days", icon: Flame, color: "text-red-500 bg-red-50" },
  { label: "Trade-In & Swap", href: "/trade-in", icon: RefreshCw, color: "text-blue-600 bg-blue-50" },
  { label: "Repairs Service", href: "/repairs", icon: Wrench, color: "text-amber-600 bg-amber-50" },
  { label: "ScrinHouse Care", href: "/care", icon: Shield, color: "text-emerald-600 bg-emerald-50" },
];

export function MobileBottomNav({ categories = [], displayName }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const totalItems = useCartStore((s) => s.totalItems);
  const cartCount = totalItems();

  // Listen for the "open-cart" custom event (e.g. when user clicks Add to Cart)
  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener("open-cart", handler);
    return () => window.removeEventListener("open-cart", handler);
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* ── Modern Floating Pill Mobile Navigation Bar ── */}
      <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md block md:hidden pointer-events-none">
        <nav
          aria-label="Mobile Floating Bottom Navigation"
          className="pointer-events-auto relative flex items-center justify-around rounded-full border border-neutral-200/80 bg-white/90 p-1.5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] ring-1 ring-black/5"
        >
          {/* Tab 1: Home */}
          <Link
            href="/"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold transition-all duration-200",
              isActive("/") && !menuOpen
                ? "bg-neutral-900 text-white shadow-md scale-[1.02]"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/60"
            )}
          >
            <Home className={cn("size-4 shrink-0 transition-transform duration-200", isActive("/") && !menuOpen && "scale-110")} />
            <span className={cn(!isActive("/") || menuOpen ? "hidden xs:inline text-[11px]" : "inline text-xs")}>
              Home
            </span>
          </Link>

          {/* Tab 2: Categories */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold transition-all duration-200",
              menuOpen
                ? "bg-neutral-900 text-white shadow-md scale-[1.02]"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/60"
            )}
          >
            <Grid3X3 className={cn("size-4 shrink-0 transition-transform duration-200", menuOpen && "scale-110")} />
            <span className={cn(!menuOpen ? "hidden xs:inline text-[11px]" : "inline text-xs")}>
              Explore
            </span>
          </button>

          {/* Tab 3: Market Days (Deals) */}
          <Link
            href="/market-days"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold transition-all duration-200 relative",
              isActive("/market-days")
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md scale-[1.02]"
                : "text-red-600 hover:bg-red-50/80"
            )}
          >
            <div className="relative flex items-center justify-center">
              <Flame className={cn("size-4 shrink-0 transition-transform duration-200", isActive("/market-days") ? "fill-white/20" : "fill-red-500/10")} />
              {!isActive("/market-days") && (
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-red-600 animate-pulse" />
              )}
            </div>
            <span className={cn(!isActive("/market-days") ? "hidden xs:inline text-[11px]" : "inline text-xs")}>
              Deals
            </span>
          </Link>

          {/* Tab 4: Cart */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold transition-all duration-200 relative",
              cartOpen
                ? "bg-neutral-900 text-white shadow-md scale-[1.02]"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/60"
            )}
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="size-4 shrink-0" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-50">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
            <span className={cn(!cartOpen ? "hidden xs:inline text-[11px]" : "inline text-xs")}>
              Cart
            </span>
          </button>

          {/* Tab 5: Account */}
          <Link
            href="/account"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 px-2 text-xs font-semibold transition-all duration-200",
              isActive("/account")
                ? "bg-neutral-900 text-white shadow-md scale-[1.02]"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/60"
            )}
          >
            <User className="size-4 shrink-0" />
            <span className={cn(!isActive("/account") ? "hidden xs:inline text-[11px]" : "inline text-xs")}>
              {displayName ? displayName.slice(0, 6) : "Account"}
            </span>
          </Link>
        </nav>
      </div>

      {/* ── Cart Drawer ── */}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {/* ── Mobile Categories & Navigation Sheet ── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 pt-3 pb-6 flex flex-col gap-0 border-t border-neutral-200">
          {/* Sheet Handle */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-neutral-300 mb-3 shrink-0" />

          <SheetHeader className="px-6 pb-3 border-b border-border flex-row items-center justify-between">
            <SheetTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-foreground" /> Explore ScrinHouse
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* User Greeting / Login Banner */}
            <div className="rounded-2xl border border-border bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-900 font-bold text-base">
                  {displayName ? displayName[0].toUpperCase() : <User className="size-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {displayName ? `Hello, ${displayName}!` : "Welcome to ScrinHouse"}
                  </p>
                  <p className="text-xs text-neutral-300">
                    {displayName ? "Manage account & wishlist" : "Sign in for saved carts & fast checkout"}
                  </p>
                </div>
              </div>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 shrink-0"
              >
                {displayName ? "Account" : "Sign In"}
              </Link>
            </div>

            {/* Quick Services Grid */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Special Services
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_FEATURE_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", link.color)}>
                        <Icon className="size-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground line-clamp-1">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Shop by Category
                </p>
                <div className="divide-y divide-border rounded-2xl border border-border bg-background">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
