import Link from "next/link";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listTopLevelCategories } from "@/services/catalog-service";
import { HeaderSearch } from "@/components/layout/header-search";
import { CartButton } from "@/components/layout/cart-button";

export async function Header() {
  const [categories, supabase] = await Promise.all([
    listTopLevelCategories().catch(() => []),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  // Pull first name for friendly desktop greeting
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
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
      <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-baseline">
            ScrinHouse<sup className="text-[10px] font-bold uppercase ml-0.5 align-super">GH</sup>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden flex-1 items-center gap-0 lg:flex ml-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              {category.name}
            </Link>
          ))}
          <Link
            href="/market-days"
            className="px-3 py-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            🔥 Market Days
          </Link>
          <Link
            href="/trade-in"
            className="px-3 py-2 text-sm font-semibold text-[#1d4ed8] hover:text-[#1e40af] transition-colors"
          >
            Trade-In &amp; Swap
          </Link>
          <Link
            href="/repairs"
            className="px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Repairs
          </Link>
          <Link
            href="/care"
            className="px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            ScrinHouse Care
          </Link>
        </nav>

        {/* Search & Actions */}
        <div className="flex flex-1 sm:flex-initial items-center justify-end gap-2">
          {/* Search bar: Inline on mobile, expandable/structured on desktop */}
          <div className="w-full max-w-[220px] sm:max-w-xs lg:w-72">
            <HeaderSearch isMobile />
          </div>

          {/* Desktop Only: Account Link */}
          <Link
            href="/account"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            aria-label="My account"
          >
            <User className="size-4" />
            <span>
              {displayName ? `Hi, ${displayName}` : "Login"}
            </span>
          </Link>

          <div className="mx-0.5 h-4 w-px bg-border hidden sm:block" />

          {/* Desktop Only: Cart Button */}
          <div className="hidden sm:block">
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
