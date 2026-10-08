"use client";

import { motion } from "framer-motion";

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

interface AccountTabLinkProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  active: boolean;
}

import Link from "next/link";

export function AccountTabLink({ id, label, icon: Icon, count = 0, active }: AccountTabLinkProps) {
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
