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
      {/* ── Modern Bigger Liquid Glass Floating Pill Mobile Navigation Bar ── */}
      <div className="fixed bottom-5 left-3 right-3 z-40 mx-auto max-w-md block md:hidden pointer-events-none">
        <nav
          aria-label="Liquid Glass Mobile Navigation"
          className="pointer-events-auto relative flex items-center justify-around rounded-[32px] border border-white/60 bg-white/40 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-2xl backdrop-saturate-200 ring-1 ring-white/80 transition-all duration-300 dark:border-white/15 dark:bg-neutral-950/40 dark:ring-white/10 before:absolute before:inset-0 before:rounded-[32px] before:bg-gradient-to-b before:from-white/40 before:to-transparent before:pointer-events-none"
        >
          {/* Tab 1: Home */}
          <Link
            href="/"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-all duration-300",
              isActive("/") && !menuOpen
                ? "bg-neutral-900/90 text-white shadow-xl shadow-neutral-950/20 backdrop-blur-md scale-[1.04]"
                : "text-neutral-700 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white"
            )}
          >
            <Home className={cn("size-5 shrink-0 transition-transform duration-300", isActive("/") && !menuOpen && "scale-110")} />
            <span className={cn(!isActive("/") || menuOpen ? "hidden xs:inline" : "inline")}>
              Home
            </span>
          </Link>

          {/* Tab 2: Categories */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-all duration-300",
              menuOpen
                ? "bg-neutral-900/90 text-white shadow-xl shadow-neutral-950/20 backdrop-blur-md scale-[1.04]"
                : "text-neutral-700 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white"
            )}
          >
            <Grid3X3 className={cn("size-5 shrink-0 transition-transform duration-300", menuOpen && "scale-110")} />
            <span className={cn(!menuOpen ? "hidden xs:inline" : "inline")}>
              Explore
            </span>
          </button>

          {/* Tab 3: Market Days (Deals) */}
          <Link
            href="/market-days"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-all duration-300 relative",
              isActive("/market-days")
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-600/30 backdrop-blur-md scale-[1.04]"
                : "text-red-600 hover:bg-red-500/10"
            )}
          >
            <div className="relative flex items-center justify-center">
              <Flame className={cn("size-5 shrink-0 transition-transform duration-300", isActive("/market-days") ? "fill-white/30" : "fill-red-500/20")} />
              {!isActive("/market-days") && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-600 animate-pulse" />
              )}
            </div>
            <span className={cn(!isActive("/market-days") ? "hidden xs:inline" : "inline")}>
              Deals
            </span>
          </Link>

          {/* Tab 4: Cart */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-all duration-300 relative",
              cartOpen
                ? "bg-neutral-900/90 text-white shadow-xl shadow-neutral-950/20 backdrop-blur-md scale-[1.04]"
                : "text-neutral-700 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white"
            )}
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="size-5 shrink-0" />
              {cartCount > 0 && (
                <span className="absolute -top-2.5 -right-3 flex min-w-[18px] h-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white shadow-md animate-in zoom-in-50">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
            <span className={cn(!cartOpen ? "hidden xs:inline" : "inline")}>
              Cart
            </span>
          </button>

          {/* Tab 5: Account */}
          <Link
            href="/account"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-all duration-300",
              isActive("/account")
                ? "bg-neutral-900/90 text-white shadow-xl shadow-neutral-950/20 backdrop-blur-md scale-[1.04]"
                : "text-neutral-700 hover:text-neutral-950 hover:bg-white/40 dark:text-neutral-300 dark:hover:text-white"
            )}
          >
            <User className="size-5 shrink-0" />
            <span className={cn(!isActive("/account") ? "hidden xs:inline" : "inline")}>
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
