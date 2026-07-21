"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { HomeSlide } from "@/types/catalog";

interface HeroSliderProps {
  slides: HomeSlide[];
  fallbackImage: string | null;
  fallbackName: string;
}

export function HeroSlider({ slides, fallbackImage, fallbackName }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use either DB slides or a default fallback slide
  const items = slides.length > 0 
    ? slides 
    : [
        {
          id: "fallback-hero",
          imageUrl: fallbackImage ?? "https://picsum.photos/seed/iphone15pro/800/800",
          title: "Phones & Repairs, Done Right.",
          subtitle: "Brand new and UK-used smartphones, genuine repair parts, and premium accessories — or book a doorstep repair with real-time tracking.",
          linkUrl: "/category/phones",
          buttonText: "Shop Now",
          isActive: true,
          displayOrder: 0,
        }
      ];

  const total = items.length;

  function startTimer() {
    stopTimer();
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 6000); // auto slide every 6 seconds
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [total]);

  const activeItem = items[activeIndex];

  return (
    <section 
      className="relative overflow-hidden bg-[#f0f0f0]"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      <div className="mx-auto flex max-w-7xl flex-col px-5 pb-14 pt-6 sm:px-8 lg:grid lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        
        {/* Column 2: Image — top on mobile, right on desktop */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl lg:order-2 lg:aspect-square bg-muted/10">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title ?? fallbackName}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>

        {/* Column 1: Captions & CTA — bottom on mobile, left on desktop */}
        <div className="relative flex flex-col items-center gap-4 pt-7 text-center lg:order-1 lg:items-start lg:gap-6 lg:pt-0 lg:text-left min-h-[220px] sm:min-h-[180px] lg:min-h-[300px]">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={item.id}
                className={`transition-all duration-700 ease-in-out ${
                  isActive 
                    ? "opacity-100 translate-y-0 z-10 relative" 
                    : "opacity-0 -translate-y-2 z-0 absolute pointer-events-none"
                }`}
              >
                {item.title && (
                  <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
                    {item.title.split("\n").map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < item.title!.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </h1>
                )}
                {item.subtitle && (
                  <p className="mt-4 max-w-sm text-sm text-muted-foreground sm:max-w-md">
                    {item.subtitle}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Button
                    size="default"
                    className="rounded-none bg-[#1d4ed8] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#1e40af]"
                    render={<Link href={item.linkUrl} />}
                  >
                    {item.buttonText}
                  </Button>
                  {/* Repairs Link (always visible as a primary action for ScrinHouse) */}
                  <Button
                    size="default"
                    variant="ghost"
                    className="rounded-none border-0 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-transparent hover:underline"
                    render={<Link href="/repairs/book" />}
                  >
                    Book a Repair
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Indicators/Dots at bottom center */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`size-2.5 rounded-full transition-all ${
                index === activeIndex 
                  ? "bg-foreground scale-110" 
                  : "bg-foreground/30 hover:bg-foreground/65"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
