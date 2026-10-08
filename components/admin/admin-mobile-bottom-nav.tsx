"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Flame,
  Grid,
  Search,
  LogOut,
  X,
  ChevronRight,
  Tag,
  Image as ImageIcon,
  BookOpen,
  MessageSquare,
  CreditCard,
  Ticket,
  Users,
  Wallet,
  Wrench,
  Shield,
  UserCog,
  BarChart3,
  Store,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog & Products",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/brands", label: "Brands", icon: Tag },
      { href: "/admin/slides", label: "Home Banners", icon: ImageIcon },
      { href: "/admin/blog", label: "Blog Posts", icon: BookOpen },
    ],
  },
  {
    label: "Selling & Promotions",
    items: [
      { href: "/admin/market-days", label: "Market Days Deals", icon: Flame },
      { href: "/admin/coupons", label: "Discount Coupons", icon: Ticket },
      { href: "/admin/installments", label: "Installment Plans", icon: CreditCard },
      { href: "/admin/repairs", label: "Device Repairs", icon: Wrench },
      { href: "/admin/care", label: "ScrinHouse Care", icon: Shield },
      { href: "/admin/enquiries", label: "Customer Enquiries", icon: MessageSquare },
      { href: "/admin/customers", label: "Customer List", icon: Users },
      { href: "/admin/wallet", label: "Wallet & Payouts", icon: Wallet },
    ],
  },
  {
    label: "Store Management",
    items: [
      { href: "/admin/employees", label: "Staff & Permissions", icon: UserCog },
      { href: "/admin/analytics", label: "Sales Analytics", icon: BarChart3 },
    ],
  },
];

interface AdminMobileBottomNavProps {
  staffName?: string | null;
  roleName?: string;
  signOutAction: () => Promise<void>;
}

export function AdminMobileBottomNav({
  staffName,
  roleName,
  signOutAction,
}: AdminMobileBottomNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Close drawer on route navigation
  useEffect(() => {
    setDrawerOpen(false);
    setSearchQuery("");
  }, [pathname]);

  const isTabActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isDashboardActive = isTabActive("/admin") && !drawerOpen;
  const isProductsActive = isTabActive("/admin/products") && !drawerOpen;
  const isCategoriesActive = isTabActive("/admin/categories") && !drawerOpen;
  const isDealsActive = isTabActive("/admin/market-days") && !drawerOpen;

  // Filter sections by search query
  const filteredSections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((sec) => sec.items.length > 0);

  return (
    <>
      {/* ── Modern Roomier Liquid Glass Floating Pill Nav for Admin ── */}
      <div className="fixed bottom-5 left-3 right-3 z-40 mx-auto max-w-md block lg:hidden pointer-events-none">
        <nav
          aria-label="Admin Liquid Glass Navigation"
          className="pointer-events-auto relative flex items-center justify-around rounded-[32px] border border-slate-700/80 bg-slate-950/50 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-200 ring-1 ring-white/15 transition-all duration-300 before:absolute before:inset-0 before:rounded-[32px] before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none"
        >
          {/* Dashboard */}
          <Link
            href="/admin"
            scroll={false}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-colors duration-200",
              isDashboardActive
                ? "text-slate-950 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/40"
            )}
          >
            {isDashboardActive && (
              <motion.div
                layoutId="adminActivePill"
                className="absolute inset-0 rounded-full bg-sky-500 shadow-xl shadow-sky-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 33 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <LayoutDashboard className="size-5 shrink-0" />
              <span className={cn(!isDashboardActive ? "hidden xs:inline" : "inline")}>
                Dashboard
              </span>
            </span>
          </Link>

          {/* Products */}
          <Link
            href="/admin/products"
            scroll={false}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-colors duration-200",
              isProductsActive
                ? "text-slate-950 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/40"
            )}
          >
            {isProductsActive && (
              <motion.div
                layoutId="adminActivePill"
                className="absolute inset-0 rounded-full bg-sky-500 shadow-xl shadow-sky-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 33 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Package className="size-5 shrink-0" />
              <span className={cn(!isProductsActive ? "hidden xs:inline" : "inline")}>
                Products
              </span>
            </span>
          </Link>

          {/* Categories */}
          <Link
            href="/admin/categories"
            scroll={false}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-colors duration-200",
              isCategoriesActive
                ? "text-slate-950 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/40"
            )}
          >
            {isCategoriesActive && (
              <motion.div
                layoutId="adminActivePill"
                className="absolute inset-0 rounded-full bg-sky-500 shadow-xl shadow-sky-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 33 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FolderTree className="size-5 shrink-0" />
              <span className={cn(!isCategoriesActive ? "hidden xs:inline" : "inline")}>
                Categories
              </span>
            </span>
          </Link>

          {/* Market Days / Selling Deals */}
          <Link
            href="/admin/market-days"
            scroll={false}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-colors duration-200",
              isDealsActive
                ? "text-white"
                : "text-red-400 hover:bg-red-950/40"
            )}
          >
            {isDealsActive && (
              <motion.div
                layoutId="adminActivePill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600 to-rose-600 shadow-xl shadow-red-600/30"
                transition={{ type: "spring", stiffness: 400, damping: 33 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Flame className="size-5 shrink-0" />
              <span className={cn(!isDealsActive ? "hidden xs:inline" : "inline")}>
                Deals
              </span>
            </span>
          </Link>

          {/* All Admin Menu Drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-3 text-xs font-bold transition-colors duration-200",
              drawerOpen
                ? "text-slate-950 font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/40"
            )}
          >
            {drawerOpen && (
              <motion.div
                layoutId="adminActivePill"
                className="absolute inset-0 rounded-full bg-sky-500 shadow-xl shadow-sky-500/25"
                transition={{ type: "spring", stiffness: 400, damping: 33 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Grid className="size-5 shrink-0" />
              <span className={cn(!drawerOpen ? "hidden xs:inline" : "inline")}>
                All Menu
              </span>
            </span>
          </button>
        </nav>
      </div>

      {/* ── Admin Mobile Sheet Drawer (Full Mobile Selling & Catalog Access) ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-slate-950 text-slate-100 border-t border-slate-800 p-0 flex flex-col">
          {/* Handle bar */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-800 my-3 shrink-0" />

          {/* Header */}
          <div className="px-6 pb-4 border-b border-slate-800 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="size-5 text-sky-400" />
                <SheetTitle className="font-heading text-lg font-bold text-slate-50">
                  Store Management
                </SheetTitle>
              </div>
              {roleName && (
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-300 border border-slate-700">
                  {roleName.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog & store admin tools..."
                className="w-full rounded-full border border-slate-800 bg-slate-900 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                No store tools match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredSections.map((sec) => (
                <div key={sec.label} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {sec.label}
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all border",
                            active
                              ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-semibold"
                              : "bg-slate-900/60 border-slate-800/80 text-slate-200 hover:bg-slate-900 hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl", active ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-400")}>
                              <Icon className="size-4" />
                            </div>
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className="size-4 text-slate-500" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* User Signout Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
            <div className="truncate max-w-[200px]">
              <p className="text-xs font-semibold text-slate-200 truncate">{staffName ?? "Admin Staff"}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Logged in</p>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs rounded-full"
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
