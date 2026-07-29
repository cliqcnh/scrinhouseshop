import { getMarketState, getNextEventStart } from "@/actions/storefront/market-days";
import { createClient } from "@/lib/supabase/server";
import { MarketCountdown } from "@/components/storefront/market-countdown";
import { LiveAuctionsFeed } from "@/components/storefront/live-auctions-feed";
import { formatPrice } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Percent, Hammer, ShieldCheck, Truck } from "lucide-react";

export const revalidate = 0; // Disable static cache to enforce dynamic real-time live evaluations

export default async function MarketDaysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const state = await getMarketState();

  let nextStartStr = null;
  if (!state.isLive && state.event) {
    nextStartStr = (await getNextEventStart(state.event.day, state.event.startTime)).toISOString();
  }

  const currentUserData = user ? { id: user.id } : null;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent inline-flex items-center gap-2">
          🔥 Market Days
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Join ScrinHouse every Tuesday and Saturday for exclusive flash discount deals and competitive live-bidding auctions.
        </p>
      </div>

      {state.isLive && state.event ? (
        // ==========================================
        // ACTIVE STATE: LIVE EVENT SCREEN
        // ==========================================
        <div className="space-y-12">
          {/* Banner & Announcement Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-red-600/10 to-amber-500/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider animate-pulse">
                🟢 Live Now
              </span>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
                {state.event.title}
              </h2>
              {state.event.announcement && (
                <p className="text-muted-foreground text-sm">{state.event.announcement}</p>
              )}
            </div>
            {state.event.bannerUrl && (
              <div className="w-full md:w-64 aspect-video overflow-hidden rounded-lg bg-muted shadow-sm">
                <img
                  src={state.event.bannerUrl}
                  alt={state.event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Section 1: Discount Deals */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-heading text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Percent className="h-6 w-6 text-red-600" /> Discount Deals
              </h2>
              <Badge variant="outline" className="font-bold border-red-600/30 text-red-600 bg-red-600/5">
                Flash Prices
              </Badge>
            </div>

            {state.discounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No active discount products registered for this event.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {state.discounts.map((item) => {
                  const isSoldOut = item.stockRemaining <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                        isSoldOut ? "opacity-75" : ""
                      }`}
                    >
                      {item.imageUrl && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted mb-4">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {item.discountPercent && (
                            <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                              -{item.discountPercent}% OFF
                            </span>
                          )}
                          <span className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Delivery Available
                          </span>
                        </div>
                      )}

                      <h3 className="font-heading text-lg font-bold text-foreground line-clamp-1">{item.name}</h3>

                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-extrabold text-foreground">
                          {formatPrice(item.discountedPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through opacity-75">
                          {formatPrice(item.originalPrice)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4 mt-4 text-xs text-muted-foreground">
                        <span>Stock remaining: {item.stockRemaining} units</span>
                        <span>Limit per customer: {item.limitPerCustomer}</span>
                      </div>

                      {isSoldOut && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-2 text-sm font-extrabold text-red-500 uppercase tracking-widest rotate-6">
                            Sold Out
                          </span>
                        </div>
                      )}

                      <div className="mt-5">
                        <Button
                          disabled={isSoldOut}
                          render={<Link href={`/products/${item.productId}`} />}
                          className="w-full font-bold transition-all shadow-sm active:scale-95"
                          variant="default"
                        >
                          {isSoldOut ? "Sold Out" : "Buy Deal"} <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Live Auctions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-heading text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Hammer className="h-6 w-6 text-amber-500" /> Live Auctions
              </h2>
              <Badge variant="outline" className="font-bold border-amber-500/30 text-amber-500 bg-amber-500/5">
                Interactive Bidding
              </Badge>
            </div>

            {state.auctions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No active live auctions registered for this event.
              </div>
            ) : (
              <LiveAuctionsFeed initialAuctions={state.auctions} currentUser={currentUserData} />
            )}
          </div>
        </div>
      ) : (
        // ==========================================
        // COUNTDOWN STATE: COMING UP SCREEN
        // ==========================================
        <div className="space-y-12">
          {/* Countdown Clock Hero Card */}
          <Card className="border border-border bg-gradient-to-b from-card to-muted p-8 text-center shadow-md max-w-3xl mx-auto rounded-2xl">
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-500 uppercase tracking-widest">
                  Upcoming Event
                </span>
                <h2 className="font-heading text-xl md:text-2xl font-extrabold text-foreground">
                  Next Market Day starts in:
                </h2>
              </div>

              {nextStartStr ? (
                <MarketCountdown targetDate={nextStartStr} />
              ) : (
                <p className="text-muted-foreground text-sm font-semibold">No scheduled events active at this time.</p>
              )}

              {state.event && (
                <div className="border-t border-border pt-4 mt-4 text-xs sm:text-sm text-muted-foreground">
                  Featured Event: <strong className="text-foreground font-bold">{state.event.title}</strong> is active every{" "}
                  <span className="text-foreground uppercase font-bold">{state.event.day}</span> between{" "}
                  <strong className="text-foreground font-bold">{state.event.startTime}</strong> and{" "}
                  <strong className="text-foreground font-bold">{state.event.endTime}</strong> (UTC).
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features highlight grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <Percent className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Premium Price Drops</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Enjoy massive price reductions on select products. Stock is limited, so arrive early!
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Hammer className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Competitive Auctions</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Bid live in real-time. Secure high-end phones and screens for a fraction of retail prices.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">Secured Wins</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                All winning bids automatically generate secure payment invoices linked to your profile order logs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
