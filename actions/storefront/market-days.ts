"use server";

import { createClient } from "@/lib/supabase/server";
import { sendSMS, sendEmail } from "@/lib/notifications";

export interface MarketEventState {
  isLive: boolean;
  event: {
    id: string;
    title: string;
    day: string;
    startTime: string;
    endTime: string;
    bannerUrl: string | null;
    announcement: string | null;
  } | null;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
  } | null;
  discounts: Array<{
    id: string;
    productId: string;
    name: string;
    imageUrl: string | null;
    originalPrice: number;
    discountPercent: number | null;
    discountedPrice: number;
    stockRemaining: number;
    limitPerCustomer: number;
    deliveryAvailable: boolean;
  }>;
  auctions: Array<{
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
  }>;
}

// Helper to calculate countdown until next Tuesday or Saturday at the event's start_time
export async function getNextEventStart(dayName: string, startTimeStr: string): Promise<Date> {
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDayIndex = daysOfWeek.indexOf(dayName.toLowerCase());

  const now = new Date();
  const targetDate = new Date(now.getTime());

  const [h, m, s] = startTimeStr.split(":").map(Number);
  targetDate.setUTCHours(h, m || 0, s || 0, 0);

  let iterations = 0;
  while (targetDate.getUTCDay() !== targetDayIndex || targetDate <= now) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
    iterations++;
    if (iterations > 14) break; // Infinite loop safety
  }
  return targetDate;
}

export async function getMarketState(): Promise<MarketEventState> {
  const supabase = await createClient();

  // Lazy trigger: process any closed/ended auctions before returning the state!
  await processEndedAuctionsInternal(supabase);

  const now = new Date();
  const dayName = now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
  
  const currentHour = now.getUTCHours();
  const currentMin = now.getUTCMinutes();
  const currentSec = now.getUTCSeconds();
  const currentTimeString = [
    String(currentHour).padStart(2, "0"),
    String(currentMin).padStart(2, "0"),
    String(currentSec).padStart(2, "0"),
  ].join(":");

  // 1. Fetch enabled events
  const { data: events } = await supabase
    .from("market_events")
    .select("*")
    .eq("is_enabled", true);

  const enabledEvents = events ?? [];

  // Find active event
  const activeEventRow = enabledEvents.find(
    (e) => e.day === dayName && e.start_time <= currentTimeString && e.end_time >= currentTimeString
  );

  if (activeEventRow) {
    // 2. Fetch event products
    const { data: marketProducts } = await supabase
      .from("market_products")
      .select(`
        id,
        sale_type,
        products (
          id,
          name,
          base_price,
          product_images ( url, is_primary )
        ),
        discount_rules (
          id,
          discount_percent,
          fixed_price,
          limit_quantity,
          limit_per_customer,
          stock_remaining
        ),
        auction_items (
          id,
          starting_price,
          reserve_price,
          min_increment,
          end_time,
          buy_now_price,
          status
        )
      `)
      .eq("event_id", activeEventRow.id);

    const productsList = marketProducts ?? [];

    const discounts: MarketEventState["discounts"] = [];
    const auctions: MarketEventState["auctions"] = [];

    for (const mp of productsList) {
      const p = mp.products as any;
      if (!p) continue;

      const images = p.product_images ?? [];
      const imageUrl = images.find((i: any) => i.is_primary)?.url ?? images[0]?.url ?? null;

      if (mp.sale_type === "discount" && mp.discount_rules) {
        const rule = mp.discount_rules as any;
        const discountPrice = rule.fixed_price 
          ? Number(rule.fixed_price) 
          : Number(p.base_price) * (1 - Number(rule.discount_percent ?? 0) / 100);

        discounts.push({
          id: rule.id,
          productId: p.id,
          name: p.name,
          imageUrl,
          originalPrice: Number(p.base_price),
          discountPercent: rule.discount_percent ? Number(rule.discount_percent) : null,
          discountedPrice: discountPrice,
          stockRemaining: Number(rule.stock_remaining),
          limitPerCustomer: Number(rule.limit_per_customer),
          deliveryAvailable: true,
        });
      } else if (mp.sale_type === "auction" && mp.auction_items) {
        const item = mp.auction_items as any;
        
        // Fetch current highest bid and bid count
        const { data: bids } = await (supabase
          .from("auction_bids") as any)
          .select("amount, user_id, created_at, profiles:profiles(full_name)")
          .eq("auction_id", item.id)
          .order("amount", { ascending: false });

        const bidsList = (bids as any) ?? [];
        const highestBid = bidsList[0] as any;
        const currentHighest = highestBid ? Number(highestBid.amount) : 0;
        
        // Mask highest bidder name (e.g. "Jane Doe" -> "J***e")
        let highestBidderName = null;
        if (highestBid?.profiles) {
          const rawName = highestBid.profiles.full_name || "Anonymous";
          highestBidderName = rawName.length > 2 
            ? rawName[0] + "***" + rawName[rawName.length - 1]
            : rawName + "***";
        }

        auctions.push({
          id: item.id,
          productId: p.id,
          name: p.name,
          imageUrl,
          retailPrice: Number(p.base_price),
          startingPrice: Number(item.starting_price),
          currentHighestBid: currentHighest,
          minIncrement: Number(item.min_increment),
          highestBidderName,
          highestBidderId: highestBid ? String(highestBid.user_id) : null,
          endTime: item.end_time,
          bidsCount: bidsList.length,
          status: item.status as any,
          buyNowPrice: item.buy_now_price ? Number(item.buy_now_price) : null,
        });
      }
    }

    return {
      isLive: true,
      event: {
        id: activeEventRow.id,
        title: activeEventRow.title,
        day: activeEventRow.day as any,
        startTime: activeEventRow.start_time,
        endTime: activeEventRow.end_time,
        bannerUrl: activeEventRow.banner_url,
        announcement: activeEventRow.announcement,
      },
      countdown: null,
      discounts,
      auctions,
    };
  }

  // 3. No active event, find next start time
  let nextStart: Date | null = null;
  let nextEvent: any = null;

  for (const ev of enabledEvents) {
    const start = await getNextEventStart(ev.day, ev.start_time);
    if (!nextStart || start < nextStart) {
      nextStart = start;
      nextEvent = ev;
    }
  }

  let countdown = null;
  if (nextStart) {
    const diffMs = nextStart.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    countdown = { days, hours, minutes };
  }

  return {
    isLive: false,
    event: nextEvent
      ? {
          id: nextEvent.id,
          title: nextEvent.title,
          day: nextEvent.day as any,
          startTime: nextEvent.start_time,
          endTime: nextEvent.end_time,
          bannerUrl: nextEvent.banner_url,
          announcement: nextEvent.announcement,
        }
      : null,
    countdown,
    discounts: [],
    auctions: [],
  };
}

export async function placeAuctionBid(
  auctionId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in to place a bid." };
  }

  // Fetch current highest bid details BEFORE placing the new bid (to identify who to notify if outbid)
  const { data: prevBids } = await supabase
    .from("auction_bids")
    .select("user_id, amount")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false })
    .limit(1);

  const prevHighest = prevBids?.[0];

  // Call the atomic postgres transaction function
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("place_bid", {
    p_auction_id: auctionId,
    p_user_id: user.id,
    p_amount: amount,
  });

  if (rpcErr) {
    console.error("RPC place_bid error:", rpcErr.message);
    return { success: false, error: "Bidding transaction failed. Please try again." };
  }

  const result = rpcRes as any;
  if (!result.success) {
    return { success: false, error: result.error ?? "Failed to place bid." };
  }

  // Bid placed successfully! Notify previous highest bidder if they were outbid
  if (prevHighest && prevHighest.user_id !== user.id) {
    const { data: prevUser } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", prevHighest.user_id)
      .single();

    const prevUserCast = prevUser as any;
    if (prevUserCast) {
      // Fetch product name
      const { data: auction } = await supabase
        .from("auction_items")
        .select("market_products(products(name))")
        .eq("id", auctionId)
        .single();

      const prodName = (auction as any)?.market_products?.products?.name ?? "an item";
      const notifyMessage = `You've been outbid on "${prodName}". Place another bid of at least GHS ${amount} before the auction ends!`;

      // 1. In-app website notification
      await supabase.from("market_notifications").insert({
        user_id: prevHighest.user_id,
        title: "You've been outbid!",
        message: notifyMessage,
      });
    }
  }

  return { success: true };
}

// Internal processor to close ended auctions, generate pending orders, and award items
export async function processEndedAuctionsInternal(supabase: any) {
  const { data: endedAuctions, error } = await supabase
    .from("auction_items")
    .select(`
      id,
      status,
      end_time,
      market_products (
        products (
          id,
          name,
          base_price,
          product_variants ( id, sku, price )
        )
      )
    `)
    .eq("status", "active")
    .lte("end_time", new Date().toISOString());

  if (error || !endedAuctions || endedAuctions.length === 0) return;

  for (const auction of endedAuctions) {
    // 1. Lock auction status as ended
    await supabase.from("auction_items").update({ status: "ended" }).eq("id", auction.id);

    // 2. Fetch highest bidder
    const { data: bids } = await supabase
      .from("auction_bids")
      .select("user_id, amount, id")
      .eq("auction_id", auction.id)
      .order("amount", { ascending: false })
      .limit(1);

    const winningBid = bids?.[0];
    if (!winningBid) {
      // No bids placed
      continue;
    }

    // 3. Fetch winner contact details
    const { data: winnerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", winningBid.user_id)
      .single();

    const winnerCast = winnerProfile as any;
    if (!winnerCast) continue;

    const prod = auction.market_products?.products as any;
    const variant = prod?.product_variants?.[0]; // Default to first product variant
    if (!prod || !variant) continue;

    // 4. Create pending order for the winner
    const deadlineHours = 24; // Admin defined deadline (default 24 hours)
    const winningAmount = Number(winningBid.amount);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: winningBid.user_id,
        status: "pending_payment",
        subtotal: winningAmount,
        delivery_fee: 0,
        total: winningAmount,
        notes: `Auction Win Order for ${prod.name}`,
      })
      .select("id")
      .single();

    if (orderErr) {
      console.error("Failed to create pending order for auction winner:", orderErr.message);
      continue;
    }

    // 5. Insert order line item
    await supabase.from("order_items").insert({
      order_id: order.id,
      variant_id: variant.id,
      product_id: prod.id,
      product_name: prod.name,
      sku: variant.sku,
      price: winningAmount,
      quantity: 1,
      subtotal: winningAmount,
    });

    // 6. Record inside auction_winners
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + deadlineHours);

    await supabase.from("auction_winners").insert({
      auction_id: auction.id,
      user_id: winningBid.user_id,
      winning_bid_id: winningBid.id,
      order_id: order.id,
      payment_deadline: deadline.toISOString(),
      status: "pending_payment",
    });

    // 7. Dispatch notifications
    const winMessage = `Congratulations! You won the auction for "${prod.name}" with a bid of GHS ${winningAmount}. Please complete your payment within ${deadlineHours} hours.`;
    
    // Website notification
    await supabase.from("market_notifications").insert({
      user_id: winningBid.user_id,
      title: "Auction Won!",
      message: winMessage,
    });

    // SMS
    if (winnerCast.phone) {
      await sendSMS(winnerCast.phone, winMessage);
    }
  }
}
