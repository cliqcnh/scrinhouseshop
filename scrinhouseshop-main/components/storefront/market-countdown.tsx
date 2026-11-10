"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: string;
}

export function MarketCountdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    function update() {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex justify-center gap-4 text-center sm:gap-6">
      <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm min-w-[70px] sm:min-w-[90px]">
        <span className="font-heading text-3xl font-bold text-foreground sm:text-5xl">
          {timeLeft.days}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          Days
        </span>
      </div>
      <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm min-w-[70px] sm:min-w-[90px]">
        <span className="font-heading text-3xl font-bold text-foreground sm:text-5xl">
          {timeLeft.hours}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          Hours
        </span>
      </div>
      <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm min-w-[70px] sm:min-w-[90px]">
        <span className="font-heading text-3xl font-bold text-foreground sm:text-5xl">
          {timeLeft.minutes}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          Mins
        </span>
      </div>
      <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm min-w-[70px] sm:min-w-[90px]">
        <span className="font-heading text-3xl font-bold text-foreground sm:text-5xl text-primary animate-pulse">
          {timeLeft.seconds}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
          Secs
        </span>
      </div>
    </div>
  );
}
