import { Bot, InlineKeyboard, InputMediaBuilder } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { formatGHS, formatShortDate } from "../utils/format";
import { TelegramAuction, TelegramAuctionUser } from "../types";
import { notifyOutbidBidder } from "../services/auction-closer";

// Pending bid input state map: telegramId -> { auctionId }
const pendingBidStates = new Map<number, { auctionId: string }>();

export function registerAuctionHandlers(bot: Bot) {
  // Handler for "🔨 Active Auctions" button and /active command
  bot.hears("🔨 Active Auctions", handleActiveAuctions);
  bot.command("active", handleActiveAuctions);

  // Handler for "📅 Upcoming Auctions" button and /upcoming command
  bot.hears("📅 Upcoming Auctions", handleUpcomingAuctions);
  bot.command("upcoming", handleUpcomingAuctions);

  // Callback query for JOIN AUCTION: join_auction_<auctionId>
  bot.callbackQuery(/^join_auction_(.+)$/, async (ctx) => {
    const auctionId = ctx.match[1];
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await handleJoinAuction(bot, ctx, telegramId, auctionId);
    await ctx.answerCallbackQuery();
  });

  // Callback query for viewing details: details_<auctionId>
  bot.callbackQuery(/^details_(.+)$/, async (ctx) => {
    const auctionId = ctx.match[1];
    await renderAuctionDetails(ctx, auctionId);
    await ctx.answerCallbackQuery();
  });

  // Callback query for starting bid process: bid_select_<auctionId>
  bot.callbackQuery(/^bid_select_(.+)$/, async (ctx) => {
    const auctionId = ctx.match[1];
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const supabase = getBotSupabaseClient();
    const { data: user } = await supabase
      .from("telegram_auction_users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (!user) {
      await ctx.reply("⚠️ You must register first before placing a bid. Send /start to register.");
      await ctx.answerCallbackQuery();
      return;
    }

    const { data: auction } = await supabase
      .from("telegram_auctions")
      .select("*")
      .eq("id", auctionId)
      .maybeSingle();

    if (!auction || auction.status !== "active") {
      await ctx.reply("❌ This auction is no longer active.");
      await ctx.answerCallbackQuery();
      return;
    }

    const currentBid = Number(auction.current_bid);
    const minIncrement = Number(auction.minimum_increment);
    const startingPrice = Number(auction.starting_price);
    const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;

    pendingBidStates.set(telegramId, { auctionId });

    const keyboard = new InlineKeyboard()
      .text(`GH₵${nextMinBid.toLocaleString()}`, `quick_bid_${auctionId}_${nextMinBid}`)
      .text(`GH₵${(nextMinBid + minIncrement).toLocaleString()}`, `quick_bid_${auctionId}_${nextMinBid + minIncrement}`)
      .row()
      .text("Cancel Bidding", "cancel_bid");

    await ctx.reply(
      `🔨 **Bidding on Auction #${auction.auction_number}**\n` +
      `📱 ${auction.title}\n\n` +
      `Current Bid: **${formatGHS(currentBid)}**\n` +
      `Minimum Next Bid: **${formatGHS(nextMinBid)}**\n\n` +
      `Select a quick bid amount below or **type your bid amount** directly (e.g. \`${nextMinBid}\`):`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
  });

  // Callback query for quick bid amount
  bot.callbackQuery(/^quick_bid_(.+)_(.+)$/, async (ctx) => {
    const auctionId = ctx.match[1];
    const amount = Number(ctx.match[2]);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await executeBidPlacement(bot, ctx, telegramId, auctionId, amount);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("cancel_bid", async (ctx) => {
    if (ctx.from?.id) {
      pendingBidStates.delete(ctx.from.id);
    }
    await ctx.reply("Bidding cancelled.");
    await ctx.answerCallbackQuery();
  });

  // Message listener for typed custom bid amounts
  bot.on("message:text", async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const pending = pendingBidStates.get(telegramId);
    if (!pending) return next();

    const text = ctx.message.text.trim().replace(/[^0-9.]/g, "");
    const amount = Number(text);

    if (isNaN(amount) || amount <= 0) {
      return next(); // Pass to regular message handlers
    }

    pendingBidStates.delete(telegramId);
    await executeBidPlacement(bot, ctx, telegramId, pending.auctionId, amount);
  });
}

async function handleJoinAuction(
  bot: Bot,
  ctx: any,
  telegramId: number,
  auctionId: string
) {
  const supabase = getBotSupabaseClient();

  // 1. Verify user registration
  const { data: user } = await supabase
    .from("telegram_auction_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user) {
    await ctx.reply(
      "⚠️ You must complete registration before joining auctions.\n\n" +
      "Send /start to register in 10 seconds!"
    );
    return;
  }

  // 2. Fetch auction
  const { data: auction } = await supabase
    .from("telegram_auctions")
    .select("*")
    .eq("id", auctionId)
    .maybeSingle();

  if (!auction) {
    await ctx.reply("❌ Auction not found.");
    return;
  }

  // 3. Upsert participant record to prevent duplicates
  const { error } = await supabase
    .from("telegram_auction_participants")
    .upsert(
      {
        auction_id: auctionId,
        auction_user_id: user.id,
        telegram_id: telegramId,
        status: "joined",
      },
      { onConflict: "auction_id,auction_user_id" }
    );

  if (error) {
    console.error("Error joining auction:", error);
  }

  // 4. Update channel stats
  await updateChannelAuctionMessage(bot, auctionId);

  // 5. Send confirmation message
  const confirmationMsg =
    `✅ **YOU'RE IN!**\n\n` +
    `You have joined:\n\n` +
    `🔨 **Scrinhouse Auction #${auction.auction_number}**\n` +
    `📱 **${auction.title}**\n\n` +
    `👤 Bidder ID: **${user.bidder_id}**\n\n` +
    `You will now receive live auction notifications for this deal.\n\n` +
    `Good luck! 🔥`;

  const keyboard = new InlineKeyboard()
    .text("🔥 BID NOW", `bid_select_${auctionId}`)
    .text("📋 FULL DETAILS", `details_${auctionId}`);

  await ctx.reply(confirmationMsg, { parse_mode: "Markdown", reply_markup: keyboard });
}

async function handleActiveAuctions(ctx: any) {
  const supabase = getBotSupabaseClient();
  const now = new Date().toISOString();

  const { data: auctions, error } = await supabase
    .from("telegram_auctions")
    .select(`
      *,
      products(name, description, condition, base_price)
    `)
    .eq("status", "active")
    .lte("start_time", now)
    .gt("end_time", now)
    .order("end_time", { ascending: true });

  if (error || !auctions || auctions.length === 0) {
    await ctx.reply(
      "🔨 **Active Auctions**\n\n" +
      "There are currently no active auctions running right now.\n" +
      "Check 📅 **Upcoming Auctions** for scheduled deals!"
    );
    return;
  }

  for (const auction of auctions as TelegramAuction[]) {
    await renderSingleAuction(ctx, auction);
  }
}

async function handleUpcomingAuctions(ctx: any) {
  const supabase = getBotSupabaseClient();

  const { data: auctions, error } = await supabase
    .from("telegram_auctions")
    .select(`
      *,
      products(name, description, condition, base_price)
    `)
    .eq("status", "upcoming")
    .order("start_time", { ascending: true });

  if (error || !auctions || auctions.length === 0) {
    await ctx.reply(
      "📅 **Upcoming Auctions**\n\n" +
      "No upcoming auctions scheduled at the moment. Stay tuned!"
    );
    return;
  }

  let text = "📅 **UPCOMING AUCTIONS**\n\n";
  for (const a of auctions as TelegramAuction[]) {
    text +=
      `🔨 **Auction #${a.auction_number}**\n` +
      `📱 ${a.title}\n` +
      `💰 Starting Bid: ${formatGHS(Number(a.starting_price))}\n` +
      `⏰ Starts: ${formatShortDate(a.start_time)}\n` +
      `⌛ Ends: ${formatShortDate(a.end_time)}\n\n`;
  }

  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function renderSingleAuction(ctx: any, auction: TelegramAuction) {
  const currentBid = Number(auction.current_bid);
  const minIncrement = Number(auction.minimum_increment);
  const startingPrice = Number(auction.starting_price);
  const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;
  const condition = auction.products?.condition
    ? auction.products.condition.toUpperCase().replace("_", " ")
    : "Very Good";

  const cardText =
    `🔨 **SCRINHOUSE AUCTION #${auction.auction_number}**\n\n` +
    `📱 **${auction.title}**\n\n` +
    `Condition: ${condition}\n\n` +
    `💰 Starting Bid:\n` +
    `${formatGHS(startingPrice)}\n\n` +
    `🔥 Current Bid:\n` +
    `${currentBid === 0 ? "No bids yet" : formatGHS(currentBid)}\n\n` +
    `📈 Minimum Next Bid:\n` +
    `${formatGHS(nextMinBid)}\n\n` +
    `⏰ Ends:\n` +
    `${formatShortDate(auction.end_time)}`;

  const keyboard = new InlineKeyboard()
    .text("🔨 JOIN AUCTION", `join_auction_${auction.id}`)
    .text("🔥 BID NOW", `bid_select_${auction.id}`)
    .row()
    .text("📋 FULL DETAILS", `details_${auction.id}`);

  // Send photo if available
  if (auction.images && auction.images.length > 0) {
    try {
      await ctx.replyWithPhoto(auction.images[0], {
        caption: cardText,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      return;
    } catch (err) {
      console.warn("Failed to send auction image photo:", err);
    }
  }

  await ctx.reply(cardText, { parse_mode: "Markdown", reply_markup: keyboard });
}

async function renderAuctionDetails(ctx: any, auctionId: string) {
  const supabase = getBotSupabaseClient();
  const { data: auction } = await supabase
    .from("telegram_auctions")
    .select(`
      *,
      products(name, description, condition, base_price)
    `)
    .eq("id", auctionId)
    .single();

  if (!auction) return;

  // Calculate stats
  const { count: participantCount } = await supabase
    .from("telegram_auction_participants")
    .select("*", { count: "exact", head: true })
    .eq("auction_id", auctionId);

  const { data: bids } = await supabase
    .from("telegram_auction_bids")
    .select("bidder_id")
    .eq("auction_id", auctionId);

  const uniqueBiddersCount = new Set(bids?.map((b) => b.bidder_id) || []).size;

  const currentBid = Number(auction.current_bid);
  const minIncrement = Number(auction.minimum_increment);
  const startingPrice = Number(auction.starting_price);
  const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;
  const desc = auction.description || auction.products?.description || "High quality device tested and verified by Scrinhouse technicians.";

  const msg =
    `🔨 **SCRINHOUSE AUCTION #${auction.auction_number}**\n\n` +
    `📱 **${auction.title}**\n\n` +
    `📋 **Description:**\n${desc}\n\n` +
    `💰 Starting Bid: **${formatGHS(startingPrice)}**\n` +
    `🔥 Current Bid: **${currentBid === 0 ? "No bids yet" : formatGHS(currentBid)}**\n` +
    `📈 Minimum Next Bid: **${formatGHS(nextMinBid)}**\n\n` +
    `👥 Participants: **${participantCount || 0}**\n` +
    `🔥 Actual Bidders: **${uniqueBiddersCount}**\n\n` +
    `⏰ Closing: **${formatShortDate(auction.end_time)}**\n\n` +
    `Anti-Sniping: ${auction.anti_snipe_enabled ? `Enabled (${auction.extension_minutes}-min auto-extension)` : "Disabled"}`;

  const keyboard = new InlineKeyboard()
    .text("🔨 JOIN AUCTION", `join_auction_${auction.id}`)
    .text("🔥 BID NOW", `bid_select_${auction.id}`);

  // Send photo gallery if images exist
  if (auction.images && auction.images.length > 0 && ctx.replyWithPhoto) {
    try {
      await ctx.replyWithPhoto(auction.images[0], {
        caption: msg,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      return;
    } catch (err) {
      // Fallback to text
    }
  }

  await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
}

async function executeBidPlacement(
  bot: Bot,
  ctx: any,
  telegramId: number,
  auctionId: string,
  amount: number
) {
  const supabase = getBotSupabaseClient();

  // Fetch bidder ID
  const { data: user } = await supabase
    .from("telegram_auction_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user) {
    await ctx.reply("❌ You must register first. Send /start to register.");
    return;
  }

  // Execute atomic PL/pgSQL function place_telegram_bid
  const { data: result, error } = await supabase.rpc("place_telegram_bid", {
    p_auction_id: auctionId,
    p_bidder_id: user.id,
    p_amount: amount,
  });

  if (error || !result || !result.success) {
    const errorMsg = result?.error || error?.message || "Invalid bid amount.";
    await ctx.reply(`❌ ${errorMsg}`);
    return;
  }

  // Success response
  let successMsg =
    `✅ **BID ACCEPTED**\n\n` +
    `Auction Bid Accepted!\n` +
    `Your bid: **${formatGHS(amount)}**\n\n` +
    `You are currently the highest bidder! 🏆`;

  if (result.extended) {
    successMsg += `\n\n⏰ **AUCTION EXTENDED!**\nA last-minute bid extended the auction by ${result.extension_minutes || 2} minutes.`;
  }

  await ctx.reply(successMsg, { parse_mode: "Markdown" });

  // Update existing channel post live
  await updateChannelAuctionMessage(bot, auctionId);

  // Send outbid notification to previous highest bidder
  if (result.previous_bidder_id && result.previous_bidder_id !== user.id) {
    const { data: auction } = await supabase
      .from("telegram_auctions")
      .select("auction_number, title")
      .eq("id", auctionId)
      .single();

    if (auction) {
      await notifyOutbidBidder(
        bot,
        auctionId,
        result.previous_bidder_id,
        amount,
        auction.auction_number,
        auction.title
      );
    }
  }
}

export async function updateChannelAuctionMessage(bot: Bot, auctionId: string) {
  const supabase = getBotSupabaseClient();
  const { data: auction } = await supabase
    .from("telegram_auctions")
    .select("*")
    .eq("id", auctionId)
    .maybeSingle();

  if (!auction || !auction.channel_message_id || !auction.channel_chat_id) {
    return;
  }

  // Count participants & unique bidders
  const { count: participantCount } = await supabase
    .from("telegram_auction_participants")
    .select("*", { count: "exact", head: true })
    .eq("auction_id", auctionId);

  const { data: bids } = await supabase
    .from("telegram_auction_bids")
    .select("bidder_id")
    .eq("auction_id", auctionId);

  const uniqueBiddersCount = new Set(bids?.map((b) => b.bidder_id) || []).size;

  const currentBid = Number(auction.current_bid);
  const minIncrement = Number(auction.minimum_increment);
  const startingPrice = Number(auction.starting_price);
  const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;
  const desc = auction.description || "Very good condition. Verified by Scrinhouse.";

  const channelText =
    `🔨 **SCRINHOUSE AUCTION #${auction.auction_number}**\n\n` +
    `📱 **${auction.title}**\n\n` +
    `📋 **DESCRIPTION**\n` +
    `${desc}\n\n` +
    `💰 Starting Bid: **${formatGHS(startingPrice)}**\n` +
    `🔥 Current Bid: **${currentBid === 0 ? "No bids yet" : formatGHS(currentBid)}**\n` +
    `📈 Minimum Next Bid: **${formatGHS(nextMinBid)}**\n\n` +
    `👥 Joined: **${participantCount || 0}**\n` +
    `🔥 Bidders: **${uniqueBiddersCount}**\n\n` +
    `⏰ Ends: **${formatShortDate(auction.end_time)}**`;

  const botUsername = bot.botInfo?.username || "ScrinhouseAuctionBot";
  const startUrl = `https://t.me/${botUsername}?start=bid_${auction.id}`;

  const keyboard = new InlineKeyboard()
    .url("🔨 JOIN AUCTION", startUrl)
    .url("🔥 BID NOW", startUrl)
    .row()
    .url("📋 FULL DETAILS", startUrl);

  try {
    if (auction.images && auction.images.length > 0) {
      await bot.api.editMessageCaption(
        auction.channel_chat_id,
        Number(auction.channel_message_id),
        {
          caption: channelText,
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );
    } else {
      await bot.api.editMessageText(
        auction.channel_chat_id,
        Number(auction.channel_message_id),
        channelText,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );
    }
  } catch (err) {
    // Ignore message unmodified errors
  }
}
