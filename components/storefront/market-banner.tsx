"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Hourglass, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketBannerProps {
  isLive: boolean;
  nextEventDate: string | null;
  eventTitle: string | null;
}

export function MarketBanner({ isLive, nextEventDate, eventTitle }: MarketBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (isLive || !nextEventDate) return;

    const target = new Date(nextEventDate).getTime();

    function update() {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Starting shortly...");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let display = "";
      if (days > 0) display += `${days}d `;
      display += `${hours}h ${minutes}m ${seconds}s`;
      setTimeLeft(display);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isLive, nextEventDate]);

  if (isLive) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-amber-500 to-red-600 bg-[length:200%_auto] animate-[shimmer_8s_ease_infinite] px-4 py-3 text-white">
        <style jsx global>{`
          @keyframes shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-black uppercase text-red-600 tracking-wider animate-pulse shadow-sm">
              Live
            </span>
            <p className="text-sm font-bold tracking-wide flex items-center justify-center gap-1.5">
              <Flame className="h-4 w-4 fill-white animate-bounce" />
              MARKET DAY IS LIVE: {eventTitle ?? "Shop Discounts & Join Live Auctions!"}
            </p>
          </div>
          <Button
            render={<Link href="/market-days" />}
            size="sm"
            variant="secondary"
            className="font-bold text-red-600 px-4 h-8 text-xs bg-white hover:bg-gray-100 shadow-sm transition-all active:scale-95 shrink-0"
          >
            Enter Event <Play className="h-3 w-3 fill-red-600 stroke-red-600 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (!nextEventDate) return null;

  return (
    <div className="bg-[#121212] border-b border-white/5 px-4 py-2.5 text-white/90">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="flex items-center gap-1 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <Hourglass className="h-3.5 w-3.5 animate-spin duration-1000" /> Next Market Day:
          </span>
          <p className="text-xs font-medium text-gray-300">
            Countdown until live discounts and auction items start:
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-extrabold tracking-widest text-amber-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 shadow-inner">
            {timeLeft || "Calculating..."}
          </span>
          <Link
            href="/market-days"
            className="text-[11px] font-bold text-white hover:text-amber-400 hover:underline transition-all flex items-center gap-0.5"
          >
            View Event Schedule <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
