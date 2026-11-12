"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Wrench,
  CreditCard,
  Shield,
  RefreshCw,
  Heart,
  Wallet,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface AccountTabWrapperProps {
  activeTab: string;
  children: React.ReactNode;
}

export function AccountTabWrapper({ activeTab, children }: AccountTabWrapperProps) {
  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  orders: Package,
  repairs: Wrench,
  installments: CreditCard,
  care: Shield,
  tradeins: RefreshCw,
  wishlist: Heart,
  wallet: Wallet,
  addresses: MapPin,
  warranties: ShieldCheck,
};

interface AccountTabLinkProps {
  id: string;
  label: string;
  count?: number;
  active: boolean;
}

export function AccountTabLink({ id, label, count = 0, active }: AccountTabLinkProps) {
  const Icon = TAB_ICON_MAP[id] ?? Package;

  return (
    <Link
      href={`/account?tab=${id}`}
      scroll={false}
      className={`relative flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors shrink-0 ${
        active
          ? "text-background font-semibold"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {active && (
        <motion.div
          layoutId="accountActiveTabPill"
          className="absolute inset-0 rounded-lg bg-foreground shadow-sm"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2.5 w-full">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
        {count > 0 && (
          <span
            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors ${
              active
                ? "bg-background text-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </Link>
  );
}

interface AccountTileCardProps {
  id: string;
  label: string;
  description?: string;
  count?: number;
  active: boolean;
}

export function AccountTileCard({ id, label, description, count = 0, active }: AccountTileCardProps) {
  const Icon = TAB_ICON_MAP[id] ?? Package;

  return (
    <Link
      href={`/account?tab=${id}`}
      scroll={false}
      className={`group relative flex flex-col justify-between rounded-xl border p-4 sm:p-5 text-left transition-all hover:shadow-md ${
        active
          ? "border-foreground bg-foreground text-background shadow-md ring-1 ring-foreground"
          : "border-border bg-card text-card-foreground hover:border-foreground/40 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex size-11 items-center justify-center rounded-xl transition-colors ${
            active
              ? "bg-background/20 text-background"
              : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-background"
          }`}
        >
          <Icon className="size-5 shrink-0" />
        </div>
        {count > 0 && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-tight ${
              active
                ? "bg-background text-foreground"
                : "bg-muted text-foreground group-hover:bg-foreground/10"
            }`}
          >
            {count}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="font-heading text-sm font-bold tracking-tight sm:text-base">
          {label}
        </h3>
        {description && (
          <p
            className={`text-xs line-clamp-1 ${
              active ? "text-background/80" : "text-muted-foreground"
            }`}
          >
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
