import Link from "next/link";
import {
  BatteryCharging,
  Headphones,
  Package,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  "phones-brand-new": Smartphone,
  "phones-uk-used": RefreshCw,
  chargers: Zap,
  "cases-protection": ShieldCheck,
  audio: Headphones,
  screens: ScanLine,
  batteries: BatteryCharging,
};

export function CategoryNav({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Shop by category" className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl justify-start md:justify-center gap-8 overflow-x-auto px-4 py-10 sm:px-6 lg:px-8 no-scrollbar">
        {categories.map((category) => {
          const Icon = ICONS_BY_SLUG[category.slug] ?? Package;
          return (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group flex shrink-0 flex-col items-center gap-3"
            >
              <span className="flex size-20 items-center justify-center rounded-full bg-[#f5f5f5] transition-colors group-hover:bg-[#e8e8e8]">
                <Icon className="size-7 text-foreground/70 transition-colors group-hover:text-foreground" strokeWidth={1.5} />
              </span>
              <span className="text-center text-xs font-semibold text-foreground">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
