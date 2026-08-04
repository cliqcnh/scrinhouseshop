import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processEndedAuctionsInternal } from "@/actions/storefront/market-days";
import { sendSMS } from "@/lib/notifications";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Simple auth security check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // 1. Process ended auctions (creates pending orders, inserts winners)
    await processEndedAuctionsInternal(supabase);

    const now = new Date();

    // 2. Automated Event and Notification Reminders
    const { data: events } = await supabase
      .from("market_events")
      .select("*")
      .eq("is_enabled", true);

    const activeEvents = events ?? [];

    for (const ev of activeEvents) {
      // Parse day and start time
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDayIndex = daysOfWeek.indexOf(ev.day.toLowerCase());

      const nextStart = new Date(now.getTime());
      const [h, m, s] = ev.start_time.split(":").map(Number);
      nextStart.setUTCHours(h, m || 0, s || 0, 0);

      while (nextStart.getUTCDay() !== targetDayIndex) {
        nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      }

      // If nextStart has already passed today, advance by 7 days
      if (nextStart < now) {
        nextStart.setUTCDate(nextStart.getUTCDate() + 7);
      }

      const timeDiffMs = nextStart.getTime() - now.getTime();
      const hoursDiff = timeDiffMs / (1000 * 60 * 60);

      // A. 24 Hours Before Reminder
      // Check if event starts in approx 24 hours (e.g. between 23.5 and 24.5 hours from now)
      if (hoursDiff >= 23.5 && hoursDiff <= 24.5) {
        // Send notification to all registered users (limit to 50 for safety)
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .limit(50);

        const usersList = (users ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>;
        if (usersList.length > 0) {
          for (const u of usersList) {
            const reminderTag = `upcoming-${ev.id}-${nextStart.toISOString().slice(0, 10)}`;
            
            // Check if notification already logged for today
            const { count } = await supabase
              .from("market_notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", u.id)
              .eq("title", reminderTag);

            if (count === 0) {
              const msg = `Reminder: ScrinHouse "${ev.title}" starts in 24 hours! Get ready for flash discounts and live bidding auctions.`;

              // In-app
              await supabase.from("market_notifications").insert({
                user_id: u.id,
                title: reminderTag,
                message: msg,
              });
            }
          }
        }
      }
    }

    // 3. Auction Ending in 10 minutes notifications
    // Find active auctions ending in approx 10 minutes (between 8 and 12 minutes from now)
    const tenMinsFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const { data: endingAuctions } = await supabase
      .from("auction_items")
      .select("id, end_time, market_products(products(name))")
      .eq("status", "active")
      .gte("end_time", new Date(tenMinsFromNow.getTime() - 2 * 60 * 1000).toISOString())
      .lte("end_time", new Date(tenMinsFromNow.getTime() + 2 * 60 * 1000).toISOString());

    if (endingAuctions && endingAuctions.length > 0) {
      for (const auc of endingAuctions) {
        // Fetch all unique bidders for this auction to notify them


        interface CronBidsQuery {
          select: (query: string) => {
            eq: (col: string, val: string) => Promise<{
              data: Array<{
                user_id: string;
                profiles: { full_name: string | null; phone: string | null } | null;
              }> | null;
              error: unknown;
            }>;
          };
        }

        const { data: bidders } = await (supabase
          .from("auction_bids") as unknown as CronBidsQuery)
          .select("user_id, profiles:profiles(full_name, phone)")
          .eq("auction_id", auc.id);

        const biddersList = bidders ?? [];
        if (biddersList.length > 0) {
          const uniqueBidders = Array.from(new Map(biddersList.map((b) => [b.user_id, b])).values());
          const prodName = (auc as unknown as { market_products?: { products?: { name: string } } }).market_products?.products?.name ?? "an item";

          for (const bidder of uniqueBidders) {
            const tag = `ending-soon-${auc.id}`;

            const { count } = await supabase
              .from("market_notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", bidder.user_id)
              .eq("title", tag);

            if (count === 0) {
              const msg = `Hurry! The live auction for "${prodName}" is ending in 10 minutes! Place your final bids now.`;
              const u = bidder.profiles;

              // In-app
              await supabase.from("market_notifications").insert({
                user_id: bidder.user_id,
                title: tag,
                message: msg,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedTime: now.toISOString() });
  } catch (err) {
    console.error("Cron market-days error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Cron job failure" }, { status: 500 });
  }
}
