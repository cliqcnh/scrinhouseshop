import { Bot, InlineKeyboard } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { formatGHS, maskPhone } from "../utils/format";
import { TelegramAuctionUser } from "../types";

export function registerAccountHandlers(bot: Bot) {
  bot.hears("💰 My Bids", handleMyBids);
  bot.command("mybids", handleMyBids);

  bot.hears("🏆 My Wins", handleMyWins);
  bot.command("mywins", handleMyWins);

  bot.hears("👤 My Account", handleMyAccount);
  bot.command("account", handleMyAccount);

  bot.hears("📜 Auction Rules", handleAuctionRules);
  bot.command("rules", handleAuctionRules);

  bot.hears("💬 Support", handleSupport);
  bot.command("support", handleSupport);
}

async function handleMyBids(ctx: any) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const supabase = getBotSupabaseClient();
  const { data: user } = await supabase
    .from("telegram_auction_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user) {
    await ctx.reply("⚠️ You are not registered yet. Send /start to register.");
    return;
  }

  // Fetch bids by user
  const { data: bids, error } = await supabase
    .from("telegram_auction_bids")
    .select(`
      id, amount, created_at,
      auction:auction_id (
        id, auction_number, title, current_bid, current_bidder_id, status
      )
    `)
    .eq("bidder_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !bids || bids.length === 0) {
    await ctx.reply("💰 **MY BIDS**\n\nYou have not placed any bids yet.");
    return;
  }

  // Deduplicate by auction
  const latestBidPerAuction = new Map<string, { b: any; auction: any }>();
  for (const b of bids as any[]) {
    const auctionObj = Array.isArray(b.auction) ? b.auction[0] : b.auction;
    if (auctionObj && !latestBidPerAuction.has(auctionObj.id)) {
      latestBidPerAuction.set(auctionObj.id, { b, auction: auctionObj });
    }
  }

  let text = "💰 **MY BIDS**\n\n";
  for (const [, item] of latestBidPerAuction) {
    const b = item.b;
    const auction = item.auction;
    const isHighest = auction.current_bidder_id === user.id;
    const isOutbid = !isHighest && auction.status === "active";
    const statusText = isHighest
      ? "🏆 Highest Bidder"
      : isOutbid
      ? "⚠️ Outbid"
      : auction.status === "ended"
      ? "🏁 Auction Ended"
      : "Closed";

    text +=
      `Auction #${auction.auction_number}\n` +
      `${auction.title}\n\n` +
      `Your bid:\n${formatGHS(Number(b.amount))}\n\n` +
      `Current:\n${formatGHS(Number(auction.current_bid))}\n\n` +
      `Status:\n${statusText}\n` +
      `-----------------------------\n`;

    if (isOutbid) {
      const keyboard = new InlineKeyboard().text("🔥 BID AGAIN", `bid_select_${auction.id}`);
      await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
      text = "";
    }
  }

  if (text.trim().length > 0) {
    await ctx.reply(text, { parse_mode: "Markdown" });
  }
}

async function handleMyWins(ctx: any) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const supabase = getBotSupabaseClient();
  const { data: user } = await supabase
    .from("telegram_auction_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user) {
    await ctx.reply("⚠️ You are not registered yet. Send /start to register.");
    return;
  }

  const { data: wins, error } = await supabase
    .from("telegram_auction_winners")
    .select(`
      id, winning_amount, payment_status, created_at,
      auction:auction_id (auction_number, title)
    `)
    .eq("bidder_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !wins || wins.length === 0) {
    await ctx.reply("🏆 **MY WINS**\n\nYou haven't won any auctions yet. Keep bidding on active deals!");
    return;
  }

  let text = "🏆 **MY WINS**\n\n";
  for (const win of wins as any[]) {
    const auc = Array.isArray(win.auction) ? win.auction[0] : win.auction;
    text +=
      `Auction #${auc?.auction_number || "N/A"}\n` +
      `${auc?.title || "Item"}\n\n` +
      `Winning Bid:\n${formatGHS(Number(win.winning_amount))}\n\n` +
      `Status:\n${win.payment_status === "paid" ? "✅ Paid" : "Payment Pending"}\n\n` +
      `-----------------------------\n`;
  }

  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function handleMyAccount(ctx: any) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const supabase = getBotSupabaseClient();
  const { data: user } = await supabase
    .from("telegram_auction_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user) {
    await ctx.reply("⚠️ You are not registered yet. Send /start to register.");
    return;
  }

  // Count wins
  const { count: winCount } = await supabase
    .from("telegram_auction_winners")
    .select("*", { count: "exact", head: true })
    .eq("bidder_id", user.id);

  // Count active bids
  const { data: activeBids } = await supabase
    .from("telegram_auction_bids")
    .select("auction_id, auction:auction_id(status)")
    .eq("bidder_id", user.id);

  const activeAuctionIds = new Set<string>();
  if (activeBids) {
    for (const b of activeBids as any[]) {
      if (b.auction?.status === "active") {
        activeAuctionIds.add(b.auction_id);
      }
    }
  }

  const accountInfo =
    `👤 **MY ACCOUNT**\n\n` +
    `Bidder ID:\n**${user.bidder_id}**\n\n` +
    `Name:\n${user.full_name}\n\n` +
    `Phone:\n${maskPhone(user.phone)}\n\n` +
    `Auctions Won:\n${winCount || 0}\n\n` +
    `Active Bids:\n${activeAuctionIds.size}`;

  await ctx.reply(accountInfo, { parse_mode: "Markdown" });
}

async function handleAuctionRules(ctx: any) {
  const rulesText =
    `📜 **SCRINHOUSE OFFICIAL AUCTION RULES**\n\n` +
    `1. **Serious Bidding Only**: Only place a bid if you genuinely intend to purchase the item.\n` +
    `2. **Minimum Increments**: Each bid must meet or exceed the specified minimum next bid.\n` +
    `3. **Binding Bids**: Bids cannot be edited or withdrawn after submission.\n` +
    `4. **Anti-Sniping Protection**: Bids placed in the final 2 minutes will automatically extend the auction countdown by 2 minutes.\n` +
    `5. **Winner Responsibility**: The highest valid bidder at auction close wins. Winners must complete payment/fulfillment within the specified window.\n` +
    `6. **No Fake Bidding**: Accounts engaging in disruptive or fake bidding will be permanently suspended.\n` +
    `7. **Administrative Rights**: Scrinhouse reserves the right to cancel an auction due to verified technical or inventory errors.`;

  await ctx.reply(rulesText, { parse_mode: "Markdown" });
}

async function handleSupport(ctx: any) {
  const supportText =
    `💬 **SCRINHOUSE CUSTOMER SUPPORT**\n\n` +
    `Need help with an auction, payment, or repair tracking?\n\n` +
    `📞 **Call / WhatsApp**: +233 24 123 4567\n` +
    `🌐 **Website**: https://scrinhouse.com\n` +
    `📍 **Showroom**: Accra, Ghana\n\n` +
    `Our team is available Monday - Saturday, 8:00 AM - 6:00 PM.`;

  await ctx.reply(supportText, { parse_mode: "Markdown" });
}
