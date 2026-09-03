import { Bot, InlineKeyboard } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { TELEGRAM_ADMIN_IDS, TELEGRAM_AUCTION_CHANNEL_ID } from "../config";
import { formatGHS, formatShortDate } from "../utils/format";
import { processEndedAuctions } from "../services/auction-closer";

// Admin creation state map
interface CreateAuctionWizardState {
  step: "select_product" | "input_title" | "input_starting_price" | "input_min_increment" | "input_duration_hours";
  productId?: string | null;
  title?: string;
  startingPrice?: number;
  minIncrement?: number;
}

const adminWizards = new Map<number, CreateAuctionWizardState>();

export function isAdmin(telegramId: number | undefined): boolean {
  if (!telegramId) return false;

  // If TELEGRAM_ADMIN_IDS is empty, allow all commands in local development/test mode
  if (TELEGRAM_ADMIN_IDS.length === 0) return true;

  return TELEGRAM_ADMIN_IDS.includes(String(telegramId));
}

export function registerAdminHandlers(bot: Bot) {
  // Guard command for admin help
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const adminHelpText =
      `🔑 **ADMIN AUCTION COMMANDS**\n\n` +
      `/createauction — Create a new auction\n` +
      `/auctions — List & manage all auctions\n` +
      `/publishchannel <auction_number> — Publish auction post to Telegram channel\n` +
      `/bids <auction_number> — View bid history\n` +
      `/endauction <auction_number> — Manually close auction & pick winner\n` +
      `/cancelauction <auction_number> — Cancel an auction\n` +
      `/winner <auction_number> — View winning details\n` +
      `/users — List registered bidders`;

    await ctx.reply(adminHelpText, { parse_mode: "Markdown" });
  });

  // /createauction
  bot.command("createauction", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const supabase = getBotSupabaseClient();
    const { data: products } = await supabase
      .from("products")
      .select("id, name, base_price, condition")
      .eq("is_active", true)
      .limit(10);

    const keyboard = new InlineKeyboard();
    if (products && products.length > 0) {
      for (const p of products) {
        keyboard.text(`${p.name} (GH₵${p.base_price})`, `admin_prod_${p.id}`).row();
      }
    }
    keyboard.text("Custom Product Title", "admin_prod_custom");

    adminWizards.set(ctx.from!.id, { step: "select_product" });

    await ctx.reply("🔨 **CREATE NEW AUCTION**\n\nSelect a product from Scrinhouse inventory or choose custom title:", {
      reply_markup: keyboard,
    });
  });

  // Callback handler for product selection
  bot.callbackQuery(/^admin_prod_(.+)$/, async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    const prodId = ctx.match[1];
    const wizard = adminWizards.get(adminId) || { step: "select_product" };

    if (prodId === "custom") {
      wizard.step = "input_title";
      adminWizards.set(adminId, wizard);
      await ctx.reply("Please enter the **Title / Name** of the item for this auction:");
    } else {
      const supabase = getBotSupabaseClient();
      const { data: prod } = await supabase.from("products").select("*").eq("id", prodId).single();

      if (prod) {
        wizard.productId = prod.id;
        wizard.title = prod.name;
        wizard.startingPrice = Math.floor(Number(prod.base_price) * 0.7); // default starting price ~70% of base
        wizard.step = "input_starting_price";
        adminWizards.set(adminId, wizard);

        await ctx.reply(
          `Selected: **${prod.name}**\n\n` +
          `Suggested Starting Price: GH₵${wizard.startingPrice}\n` +
          `Please reply with your desired **Starting Price** in GH₵:`
        );
      }
    }
    await ctx.answerCallbackQuery();
  });

  // Message listener for wizard inputs
  bot.on("message:text", async (ctx, next) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return next();

    const wizard = adminWizards.get(adminId);
    if (!wizard) return next();

    const text = ctx.message.text.trim();

    if (wizard.step === "input_title") {
      wizard.title = text;
      wizard.step = "input_starting_price";
      adminWizards.set(adminId, wizard);
      await ctx.reply("Great! Now enter the **Starting Price** in GH₵ (e.g. 4000):");
      return;
    }

    if (wizard.step === "input_starting_price") {
      const num = Number(text);
      if (isNaN(num) || num < 0) {
        await ctx.reply("Please enter a valid starting price:");
        return;
      }
      wizard.startingPrice = num;
      wizard.step = "input_min_increment";
      adminWizards.set(adminId, wizard);
      await ctx.reply("Enter the **Minimum Next Bid Increment** in GH₵ (default e.g. 100):");
      return;
    }

    if (wizard.step === "input_min_increment") {
      const num = Number(text);
      if (isNaN(num) || num <= 0) {
        await ctx.reply("Please enter a valid minimum increment:");
        return;
      }
      wizard.minIncrement = num;
      wizard.step = "input_duration_hours";
      adminWizards.set(adminId, wizard);
      await ctx.reply("Enter the **Auction Duration in Hours** (e.g. 24 or 48):");
      return;
    }

    if (wizard.step === "input_duration_hours") {
      const hours = Number(text);
      if (isNaN(hours) || hours <= 0) {
        await ctx.reply("Please enter valid duration hours:");
        return;
      }

      adminWizards.delete(adminId);

      const supabase = getBotSupabaseClient();

      // Determine next auction_number e.g. 001
      const { count } = await supabase.from("telegram_auctions").select("*", { count: "exact", head: true });
      const auctionNum = String((count || 0) + 1).padStart(3, "0");

      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { data: newAuction, error } = await supabase
        .from("telegram_auctions")
        .insert({
          auction_number: auctionNum,
          product_id: wizard.productId || null,
          title: wizard.title || "Scrinhouse Item",
          starting_price: wizard.startingPrice || 1000,
          minimum_increment: wizard.minIncrement || 100,
          current_bid: 0,
          start_time: startTime,
          end_time: endTime,
          status: "active",
          anti_snipe_enabled: true,
          extension_minutes: 2,
        })
        .select()
        .single();

      if (error || !newAuction) {
        console.error("Error creating auction:", error);
        await ctx.reply("❌ Error creating auction in database.");
        return;
      }

      await ctx.reply(
        `✅ **AUCTION CREATED & ACTIVATED!**\n\n` +
        `Auction Number: **#${newAuction.auction_number}**\n` +
        `Item: **${newAuction.title}**\n` +
        `Starting Price: **${formatGHS(Number(newAuction.starting_price))}**\n` +
        `Min Increment: **${formatGHS(Number(newAuction.minimum_increment))}**\n` +
        `End Time: **${formatShortDate(newAuction.end_time)}**\n\n` +
        `To publish this to your Telegram Channel, send:\n` +
        `/publishchannel ${newAuction.auction_number}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    return next();
  });

  // /auctions
  bot.command("auctions", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const supabase = getBotSupabaseClient();
    const { data: auctions } = await supabase
      .from("telegram_auctions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!auctions || auctions.length === 0) {
      await ctx.reply("No auctions found.");
      return;
    }

    let text = "🔨 **ADMIN AUCTION LIST**\n\n";
    for (const a of auctions) {
      text +=
        `#${a.auction_number} | **${a.title}**\n` +
        `Status: ${a.status.toUpperCase()} | Current Bid: ${formatGHS(Number(a.current_bid))}\n` +
        `Ends: ${formatShortDate(a.end_time)}\n` +
        `Commands: /endauction ${a.auction_number} | /cancelauction ${a.auction_number}\n\n`;
    }

    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // /publishchannel <auction_number>
  bot.command("publishchannel", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const auctionNum = ctx.match.trim();
    if (!auctionNum) {
      await ctx.reply("Usage: /publishchannel <auction_number>");
      return;
    }

    const supabase = getBotSupabaseClient();
    const { data: auction } = await supabase
      .from("telegram_auctions")
      .select("*")
      .eq("auction_number", auctionNum)
      .maybeSingle();

    if (!auction) {
      await ctx.reply("❌ Auction not found.");
      return;
    }

    if (!TELEGRAM_AUCTION_CHANNEL_ID) {
      await ctx.reply("⚠️ TELEGRAM_AUCTION_CHANNEL_ID is not configured in environment variables.");
      return;
    }

    const botUsername = ctx.me.username;
    const startUrl = `https://t.me/${botUsername}?start=bid_${auction.id}`;

    const channelPost =
      `🔨 **SCRINHOUSE AUCTION #${auction.auction_number}**\n\n` +
      `📱 **${auction.title}**\n\n` +
      `💰 Starting Bid: **${formatGHS(Number(auction.starting_price))}**\n` +
      `📈 Minimum Increase: **${formatGHS(Number(auction.minimum_increment))}**\n` +
      `⏰ Ends: **${formatShortDate(auction.end_time)}**\n\n` +
      `Click below to place your bids directly in the bot!`;

    const keyboard = new InlineKeyboard()
      .url("🔥 BID NOW", startUrl)
      .url("📋 AUCTION DETAILS", startUrl);

    try {
      await bot.api.sendMessage(TELEGRAM_AUCTION_CHANNEL_ID, channelPost, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      await ctx.reply(`✅ Successfully published Auction #${auction.auction_number} to channel ${TELEGRAM_AUCTION_CHANNEL_ID}!`);
    } catch (err) {
      console.error("Failed to post to channel:", err);
      await ctx.reply(`❌ Failed to publish to channel: ${err instanceof Error ? err.message : err}`);
    }
  });

  // /endauction <auction_number>
  bot.command("endauction", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const num = ctx.match.trim();
    if (!num) {
      await ctx.reply("Usage: /endauction <auction_number>");
      return;
    }

    const supabase = getBotSupabaseClient();
    await supabase
      .from("telegram_auctions")
      .update({ status: "active", end_time: new Date().toISOString() })
      .eq("auction_number", num);

    await processEndedAuctions(bot);
    await ctx.reply(`✅ Auction #${num} has been manually ended and winner processed.`);
  });

  // /cancelauction <auction_number>
  bot.command("cancelauction", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const num = ctx.match.trim();
    if (!num) {
      await ctx.reply("Usage: /cancelauction <auction_number>");
      return;
    }

    const supabase = getBotSupabaseClient();
    await supabase
      .from("telegram_auctions")
      .update({ status: "cancelled" })
      .eq("auction_number", num);

    await ctx.reply(`✅ Auction #${num} has been cancelled.`);
  });

  // /bids <auction_number>
  bot.command("bids", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const num = ctx.match.trim();
    if (!num) {
      await ctx.reply("Usage: /bids <auction_number>");
      return;
    }

    const supabase = getBotSupabaseClient();
    const { data: auction } = await supabase.from("telegram_auctions").select("id, title").eq("auction_number", num).maybeSingle();

    if (!auction) {
      await ctx.reply("❌ Auction not found.");
      return;
    }

    const { data: bids } = await supabase
      .from("telegram_auction_bids")
      .select("amount, created_at, bidder:bidder_id(full_name, bidder_id)")
      .eq("auction_id", auction.id)
      .order("created_at", { ascending: false });

    if (!bids || bids.length === 0) {
      await ctx.reply(`No bids recorded for Auction #${num}.`);
      return;
    }

    let msg = `📜 **BIDS FOR AUCTION #${num} (${auction.title})**\n\n`;
    for (const b of bids as any[]) {
      msg += `• ${formatGHS(Number(b.amount))} by ${b.bidder?.full_name} (${b.bidder?.bidder_id}) at ${formatShortDate(b.created_at)}\n`;
    }

    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // /winner <auction_number>
  bot.command("winner", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const num = ctx.match.trim();
    const supabase = getBotSupabaseClient();
    const { data: win } = await supabase
      .from("telegram_auction_winners")
      .select(`
        winning_amount, payment_status, created_at,
        auction:auction_id(auction_number, title),
        bidder:bidder_id(full_name, phone, bidder_id, telegram_username)
      `)
      .eq("auction.auction_number", num)
      .maybeSingle();

    if (!win) {
      await ctx.reply("No winning record found for this auction.");
      return;
    }

    const bidder = Array.isArray(win.bidder) ? win.bidder[0] : win.bidder;

    const msg =
      `🏆 **WINNER RECORD — AUCTION #${num}**\n\n` +
      `Bidder: ${bidder?.full_name} (${bidder?.bidder_id})\n` +
      `Phone: ${bidder?.phone}\n` +
      `Telegram Username: @${bidder?.telegram_username || "N/A"}\n` +
      `Winning Amount: ${formatGHS(Number(win.winning_amount))}\n` +
      `Payment Status: ${win.payment_status}`;

    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  // /users
  bot.command("users", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;

    const supabase = getBotSupabaseClient();
    const { data: users } = await supabase
      .from("telegram_auction_users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);

    if (!users || users.length === 0) {
      await ctx.reply("No registered bidders.");
      return;
    }

    let text = "👥 **REGISTERED BIDDERS**\n\n";
    for (const u of users) {
      text += `• **${u.bidder_id}**: ${u.full_name} (${u.phone}) [@${u.telegram_username || "N/A"}]\n`;
    }

    await ctx.reply(text, { parse_mode: "Markdown" });
  });
}
