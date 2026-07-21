"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Wrench,
  UserCog,
  BarChart3,
  Image,
  BookOpen,
  CreditCard,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/brands", label: "Brands", icon: Tag },
      { href: "/admin/slides", label: "Home Slides", icon: Image },
      { href: "/admin/blog", label: "Blog Posts", icon: BookOpen },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/installments", label: "Installments", icon: CreditCard },
      { href: "/admin/trade-ins", label: "Trade-Ins", icon: RefreshCw },
      { href: "/admin/coupons", label: "Coupons", icon: Ticket },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/repairs", label: "Repairs", icon: Wrench },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/employees", label: "Employees", icon: UserCog },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/admin" className="font-heading text-lg font-bold text-sidebar-foreground flex items-baseline">
          ScrinHouse<sup className="text-[10px] font-bold uppercase ml-0.5 align-super">GH</sup>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
