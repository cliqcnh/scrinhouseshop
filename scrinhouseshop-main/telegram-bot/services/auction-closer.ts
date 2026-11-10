import { Bot, InlineKeyboard } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { formatGHS } from "../utils/format";
import { TelegramAuction } from "../types";

export async function processEndedAuctions(bot?: Bot) {
  const supabase = getBotSupabaseClient();
  const now = new Date().toISOString();

  // Find active auctions past end_time
  const { data: expiredAuctions, error } = await supabase
    .from("telegram_auctions")
    .select(`
      *,
      current_bidder:current_bidder_id(*)
    `)
    .eq("status", "active")
    .lte("end_time", now);

  if (error || !expiredAuctions || expiredAuctions.length === 0) {
    return;
  }

  for (const auction of expiredAuctions as TelegramAuction[]) {
    // 1. Mark auction as ended
    await supabase
      .from("telegram_auctions")
      .update({ status: "ended", updated_at: now })
      .eq("id", auction.id);

    // 2. Check winner
    if (auction.current_bidder_id && auction.current_bid > 0) {
      // Create winner record
      const { data: winnerRec } = await supabase
        .from("telegram_auction_winners")
        .insert({
          auction_id: auction.id,
          bidder_id: auction.current_bidder_id,
          winning_amount: auction.current_bid,
          payment_status: "pending_payment",
        })
        .select()
        .single();

      // Notify winner via Telegram
      const winnerUser = auction.current_bidder;
      if (bot && winnerUser && winnerUser.telegram_id) {
        try {
          const winnerMsg =
            `🎉 CONGRATULATIONS!\n\n` +
            `You won Scrinhouse Auction #${auction.auction_number}.\n\n` +
            `📱 ${auction.title}\n\n` +
            `Winning Bid:\n` +
            `${formatGHS(auction.current_bid)}\n\n` +
            `You will receive instructions from Scrinhouse for completing the purchase.`;

          await bot.api.sendMessage(winnerUser.telegram_id, winnerMsg);
        } catch (err) {
          console.error(`Failed to send winner Telegram message to ${winnerUser.telegram_id}:`, err);
        }
      }

      // Notify other participating bidders that auction ended
      const { data: bids } = await supabase
        .from("telegram_auction_bids")
        .select("bidder:bidder_id(telegram_id)")
        .eq("auction_id", auction.id);

      if (bids && bot) {
        const uniqueTelegramIds = new Set<number>();
        for (const b of bids as any[]) {
          if (b.bidder?.telegram_id && b.bidder.telegram_id !== winnerUser?.telegram_id) {
            uniqueTelegramIds.add(b.bidder.telegram_id);
          }
        }

        for (const tId of uniqueTelegramIds) {
          try {
            const endedMsg =
              `🏁 AUCTION ENDED\n\n` +
              `Auction #${auction.auction_number} (${auction.title}) has closed.\n\n` +
              `Winning Bid: ${formatGHS(auction.current_bid)}\n\n` +
              `Thank you for participating! Check 🔨 Active Auctions for more deals.`;
            await bot.api.sendMessage(tId, endedMsg);
          } catch (err) {
            // Ignore individual delivery errors
          }
        }
      }
    }
  }
}

export async function notifyOutbidBidder(
  bot: Bot,
  auctionId: string,
  prevBidderId: string,
  newAmount: number,
  auctionNumber: string,
  title: string
) {
  const supabase = getBotSupabaseClient();
  const { data: prevUser } = await supabase
    .from("telegram_auction_users")
    .select("telegram_id")
    .eq("id", prevBidderId)
    .single();

  if (!prevUser || !prevUser.telegram_id) return;

  const msg =
    `⚠️ YOU'VE BEEN OUTBID!\n\n` +
    `Auction #${auctionNumber}\n` +
    `${title}\n\n` +
    `Current bid:\n` +
    `${formatGHS(newAmount)}\n\n` +
    `Click below to place a higher bid!`;

  const keyboard = new InlineKeyboard().text("🔥 BID AGAIN", `bid_select_${auctionId}`);

  try {
    await bot.api.sendMessage(prevUser.telegram_id, msg, {
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error(`Failed to send outbid notification to ${prevUser.telegram_id}:`, err);
  }
}
