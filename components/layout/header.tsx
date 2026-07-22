import Link from "next/link";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/server";
import { listTopLevelCategories } from "@/services/catalog-service";
import { HeaderSearch } from "@/components/layout/header-search";
import { MobileSearchToggle } from "@/components/layout/mobile-search-toggle";
import { CartButton } from "@/components/layout/cart-button";

const STATIC_LINKS = [
  { label: "Trade-In & Swap", href: "/trade-in" },
  { label: "Repairs", href: "/repairs" },
  { label: "Track Order", href: "/track" },
];

export async function Header() {
  const [categories, supabase] = await Promise.all([
    listTopLevelCategories(),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  // Pull first name for a friendly greeting
  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>ScrinHouse<sup className="text-[10px] font-bold uppercase ml-0.5 align-super">GH</sup></SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4 mt-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {category.name}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              {STATIC_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <User className="size-4" />
                {displayName ? `Hi, ${displayName}` : "Account / Login"}
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-4 flex shrink-0 items-center gap-2">
          <span className="font-heading text-xl font-bold tracking-tight text-foreground flex items-baseline">
            ScrinHouse<sup className="text-[10px] font-bold uppercase ml-0.5 align-super">GH</sup>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-0 lg:flex">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="px-3.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href="/trade-in"
            className="px-3.5 py-2 text-sm font-semibold text-[#1d4ed8] hover:text-[#1e40af] transition-colors"
          >
            Trade-In &amp; Swap
          </Link>
          <Link
            href="/repairs"
            className="px-3.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Repairs
          </Link>
          <Link
            href="/track"
            className="px-3.5 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Track Order
          </Link>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* Auth link — server-rendered, reflects current session */}
          <Link
            href="/account"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            aria-label="My account"
          >
            <User className="size-5 sm:size-4" />
            <span className="hidden sm:inline">
              {displayName ? `Hi, ${displayName}` : "Login / Register"}
            </span>
          </Link>

          <MobileSearchToggle />

          <div className="mx-1 h-4 w-px bg-border hidden sm:block" />

          <HeaderSearch />

          {/* Cart button — client island (badge + drawer) */}
          <CartButton />
        </div>
      </div>
    </header>
  );
}
