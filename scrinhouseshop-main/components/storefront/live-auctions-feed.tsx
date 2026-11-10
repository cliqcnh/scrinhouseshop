"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { placeAuctionBid } from "@/actions/storefront/market-days";
import { formatPrice } from "@/utils/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PlayCircle, Clock, Award, Hammer, MessageSquare } from "lucide-react";

interface AuctionItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  retailPrice: number;
  startingPrice: number;
  currentHighestBid: number;
  minIncrement: number;
  highestBidderName: string | null;
  highestBidderId: string | null;
  endTime: string;
  bidsCount: number;
  status: "active" | "ended" | "cancelled";
  buyNowPrice: number | null;
  condition: string;
}

interface AuctionsFeedProps {
  initialAuctions: AuctionItem[];
  currentUser: { id: string } | null;
}

export function LiveAuctionsFeed({ initialAuctions, currentUser }: AuctionsFeedProps) {
  const [auctions, setAuctions] = useState<AuctionItem[]>(initialAuctions);
  const [selectedAuction, setSelectedAuction] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timers, setTimers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  const supabase = createClient();

  // 1. Realtime updates listener
  useEffect(() => {
    const channel = supabase
      .channel("live_market_bids")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auction_bids" },
        async (payload) => {
          const newBid = payload.new as { auction_id: string; user_id: string; amount: number };
          if (!newBid) return;

          // Fetch the updated bids count and highest bid details for this auction item
          interface RealtimeBidsQuery {
            select: (query: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => Promise<{
                  data: Array<{
                    amount: number;
                    user_id: string;
                    profiles: { full_name: string | null } | null;
                  }> | null;
                  error: unknown;
                }>;
              };
            };
          }

          const { data: bids } = await (supabase
            .from("auction_bids") as unknown as RealtimeBidsQuery)
            .select("amount, user_id, profiles:profiles(full_name)")
            .eq("auction_id", newBid.auction_id)
            .order("amount", { ascending: false });

          const bidsList = bids ?? [];
          if (bidsList.length === 0) return;

          const highest = bidsList[0];
          const rawName = highest.profiles?.full_name || "Anonymous";
          const maskedName = rawName.length > 2
            ? rawName[0] + "***" + rawName[rawName.length - 1]
            : rawName + "***";

          // Update local auctions list state
          setAuctions((prev) =>
            prev.map((auc) => {
              if (auc.id === newBid.auction_id) {
                const currentBid = Number(highest.amount);
                // Trigger client outbid sound/alert if current user was previously high bidder but is now outbid
                if (
                  currentUser &&
                  auc.highestBidderId === currentUser.id &&
                  highest.user_id !== currentUser.id
                ) {
                  toast.warning(`You've been outbid on "${auc.name}"!`);
                }

                return {
                  ...auc,
                  currentHighestBid: currentBid,
                  bidsCount: bidsList.length,
                  highestBidderName: maskedName,
                  highestBidderId: String(highest.user_id),
                };
              }
              return auc;
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser]);

  // 2. Client-side auction countdown timers
  useEffect(() => {
    function updateTimers() {
      const now = new Date().getTime();
      const updated: Record<string, string> = {};

      auctions.forEach((auc) => {
        const target = new Date(auc.endTime).getTime();
        const diff = target - now;

        if (diff <= 0) {
          updated[auc.id] = "Ended";
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          let display = "";
          if (days > 0) display += `${days}d `;
          display += `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
          updated[auc.id] = display;
        }
      });

      setTimers(updated);
    }

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [auctions]);

  // 3. Bid Submissions handler
  const handleOpenBidModal = (auc: AuctionItem) => {
    if (!currentUser) {
      toast.error("Please login to place a bid on this product.");
      return;
    }
    setAgreed(false);
    setSelectedAuction(auc);
    const minBid = auc.currentHighestBid > 0 
      ? auc.currentHighestBid + auc.minIncrement 
      : auc.startingPrice;
    setBidAmount(String(minBid));
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuction || !currentUser) return;

    if (!agreed) {
      toast.error("You must agree to the bidding terms and product condition before placing a bid.");
      return;
    }

    const amount = Number(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    const minAllowed = selectedAuction.currentHighestBid > 0
      ? selectedAuction.currentHighestBid + selectedAuction.minIncrement
      : selectedAuction.startingPrice;

    if (amount < minAllowed) {
      toast.error(`Minimum bid allowed is GHS ${minAllowed}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await placeAuctionBid(selectedAuction.id, amount);
      if (res.success) {
        toast.success("Congratulations! You are currently the highest bidder.");
        setSelectedAuction(null);
        setAgreed(false);
      } else {
        toast.error(res.error ?? "Failed to place bid.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {auctions.map((auc) => {
          const isHighBidder = currentUser && auc.highestBidderId === currentUser.id;
          const displayTime = timers[auc.id] || "Loading...";

          return (
            <div
              key={auc.id}
              className={`relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${
                isHighBidder ? "border-green-500 bg-green-500/5" : "border-border"
              }`}
            >
              {auc.imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted mb-4">
                  <img
                    src={auc.imageUrl}
                    alt={auc.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                      <PlayCircle className="h-3 w-3" /> Live
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white">
                      <Clock className="h-3 w-3" /> {displayTime}
                    </span>
                  </div>
                </div>
              )}

              <h3 className="font-heading text-lg font-bold text-foreground line-clamp-1">{auc.name}</h3>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 mt-4 text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Retail Price</span>
                  <p className="font-medium text-foreground line-through opacity-60">
                    {formatPrice(auc.retailPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Starting Bid</span>
                  <p className="font-medium text-foreground">{formatPrice(auc.startingPrice)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 mt-4 text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary">Current Bid</span>
                  <p className="text-lg font-extrabold text-foreground">
                    {auc.currentHighestBid > 0 ? formatPrice(auc.currentHighestBid) : "No bids yet"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Highest Bidder</span>
                  <p className="font-semibold text-foreground truncate">
                    {auc.highestBidderName || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 mt-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hammer className="h-3.5 w-3.5 text-primary" /> {auc.bidsCount} bid(s) placed
                </span>
                <span>Min Incr: {formatPrice(auc.minIncrement)}</span>
              </div>

              <div className="mt-5">
                {displayTime === "Ended" ? (
                  <Button disabled variant="outline" className="w-full">
                    Auction Ended
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleOpenBidModal(auc)}
                    className="w-full font-bold transition-all shadow-sm active:scale-95"
                    variant={isHighBidder ? "outline" : "default"}
                  >
                    {isHighBidder ? "🏆 Highest Bidder" : "Place Bid"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bidding Modal Dialog */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl p-6 relative">
            <h3 className="font-heading text-xl font-bold text-foreground mb-1">Place Your Bid</h3>
            <p className="text-xs text-muted-foreground mb-4 truncate">{selectedAuction.name}</p>

            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting Bid:</span>
                  <span className="font-bold">{formatPrice(selectedAuction.startingPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Highest Bid:</span>
                  <span className="font-bold text-foreground">
                    {selectedAuction.currentHighestBid > 0 ? formatPrice(selectedAuction.currentHighestBid) : "None"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-primary font-semibold">
                  <span>Minimum Required Bid:</span>
                  <span>
                    {formatPrice(
                      selectedAuction.currentHighestBid > 0
                        ? selectedAuction.currentHighestBid + selectedAuction.minIncrement
                        : selectedAuction.startingPrice
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Bid Amount (GHS)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">GH₵</span>
                  <Input
                    type="number"
                    step="1"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="pl-12 font-bold text-lg"
                    placeholder="Enter bid value"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-muted-foreground select-none cursor-pointer leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-border text-foreground focus:ring-foreground size-4 shrink-0 bg-background"
                  />
                  <span>
                    I agree to the bidding terms {"&"} conditions, and confirm I have reviewed this item{"'"}s state (<strong>{selectedAuction.condition.toUpperCase()}</strong> condition).
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedAuction(null)}
                  disabled={isSubmitting}
                  className="flex-1 font-semibold"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 font-bold">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                    </>
                  ) : (
                    "Confirm Bid"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
