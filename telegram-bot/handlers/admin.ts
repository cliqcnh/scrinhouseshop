import { Bot, InlineKeyboard } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { TELEGRAM_ADMIN_IDS, TELEGRAM_AUCTION_CHANNEL_ID } from "../config";
import { formatGHS, formatShortDate } from "../utils/format";
import { processEndedAuctions } from "../services/auction-closer";

// Admin creation state map
interface CreateAuctionWizardState {
  step: "select_product" | "input_title" | "input_description" | "upload_images" | "input_starting_price" | "input_min_increment" | "input_duration_hours";
  productId?: string | null;
  title?: string;
  description?: string;
  images: string[];
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
  // Admin help command
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const adminHelpText =
      `🔑 **ADMIN AUCTION COMMANDS**\n\n` +
      `/createauction — Create a new auction with photos & description\n` +
      `/auctions — List & manage all auctions\n` +
      `/publishchannel <auction_number> — Publish auction to Telegram channel\n` +
      `/participants — View participant list & bidder stats\n` +
      `/auctionstats — Detailed auction analytics & metrics\n` +
      `/bids <auction_number> — View complete bid log\n` +
      `/endauction <auction_number> — Manually close auction & pick winner\n` +
      `/cancelauction <auction_number> — Cancel an auction\n` +
      `/winner <auction_number> — View winning bidder details\n` +
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

    adminWizards.set(ctx.from!.id, { step: "select_product", images: [] });

    await ctx.reply("🔨 **CREATE NEW AUCTION**\n\nSelect a product from Scrinhouse inventory or choose custom title:", {
      reply_markup: keyboard,
    });
  });

  // Callback handler for product selection
  bot.callbackQuery(/^admin_prod_(.+)$/, async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    const prodId = ctx.match[1];
    const wizard = adminWizards.get(adminId) || { step: "select_product", images: [] };

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
        wizard.description = prod.description || `${prod.name} in ${prod.condition || "great"} condition.`;
        wizard.startingPrice = Math.floor(Number(prod.base_price) * 0.7); // default starting price ~70% of base
        wizard.step = "input_description";
        adminWizards.set(adminId, wizard);

        await ctx.reply(
          `Selected: **${prod.name}**\n\n` +
          `Please enter/confirm the **Detailed Description** for this auction (or send \`skip\` to use existing):`
        );
      }
    }
    await ctx.answerCallbackQuery();
  });

  // Photo listener for image uploads during wizard
  bot.on("message:photo", async (ctx, next) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return next();

    const wizard = adminWizards.get(adminId);
    if (!wizard || wizard.step !== "upload_images") return next();

    const photos = ctx.message.photo;
    if (!photos || photos.length === 0) return next();

    // Get highest resolution photo file_id
    const fileId = photos[photos.length - 1].file_id;

    if (wizard.images.length >= 5) {
      await ctx.reply("⚠️ Maximum 5 images reached per auction.");
      return;
    }

    wizard.images.push(fileId);
    adminWizards.set(adminId, wizard);

    const keyboard = new InlineKeyboard()
      .text("✅ DONE WITH IMAGES", "admin_images_done")
      .text("⏭️ SKIP IMAGES", "admin_images_done");

    await ctx.reply(
      `📸 Image ${wizard.images.length}/5 received!\n\n` +
      `Send another photo or tap **DONE WITH IMAGES** when finished:`,
      { reply_markup: keyboard }
    );
  });

  // Callback for finishing image uploads
  bot.callbackQuery("admin_images_done", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    const wizard = adminWizards.get(adminId);
    if (wizard && wizard.step === "upload_images") {
      wizard.step = "input_starting_price";
      adminWizards.set(adminId, wizard);

      await ctx.reply(
        `Images recorded: **${wizard.images.length}**\n\n` +
        `Now enter the desired **Starting Price** in GH₵ (e.g. 4000):`
      );
    }
    await ctx.answerCallbackQuery();
  });

  // Message listener for wizard text inputs
  bot.on("message:text", async (ctx, next) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return next();

    const wizard = adminWizards.get(adminId);
    if (!wizard) return next();

    const text = ctx.message.text.trim();

    if (wizard.step === "input_title") {
      wizard.title = text;
      wizard.step = "input_description";
      adminWizards.set(adminId, wizard);
      await ctx.reply("Great! Now enter the **Detailed Description** for this auction:");
      return;
    }

    if (wizard.step === "input_description") {
      if (text.toLowerCase() !== "skip") {
        wizard.description = text;
      }
      wizard.step = "upload_images";
      adminWizards.set(adminId, wizard);

      const keyboard = new InlineKeyboard()
        .text("✅ DONE WITH IMAGES", "admin_images_done")
        .text("⏭️ SKIP IMAGES", "admin_images_done");

      await ctx.reply(
        "📸 **Upload Product Images**\n\n" +
        "You can send 1 to 5 product photos now.\n" +
        "When finished, tap **DONE WITH IMAGES** or **SKIP IMAGES**:",
        { reply_markup: keyboard }
      );
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
          description: wizard.description || "High quality device tested by Scrinhouse.",
          images: wizard.images || [],
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
        `Images: **${newAuction.images?.length || 0}**\n` +
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
        `Commands: /publishchannel ${a.auction_number} | /participants ${a.auction_number} | /auctionstats ${a.auction_number}\n\n`;
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

    // Get participant & bidder counts
    const { count: participantCount } = await supabase
      .from("telegram_auction_participants")
      .select("*", { count: "exact", head: true })
      .eq("auction_id", auction.id);

    const { data: bids } = await supabase
      .from("telegram_auction_bids")
      .select("bidder_id")
      .eq("auction_id", auction.id);

    const uniqueBiddersCount = new Set(bids?.map((b) => b.bidder_id) || []).size;
    const currentBid = Number(auction.current_bid);
    const minIncrement = Number(auction.minimum_increment);
    const startingPrice = Number(auction.starting_price);
    const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;
    const desc = auction.description || "Very good condition. Tested and verified by Scrinhouse.";

    const channelPost =
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

    const keyboard = new InlineKeyboard()
      .url("🔨 JOIN AUCTION", startUrl)
      .url("🔥 BID NOW", startUrl)
      .row()
      .url("📋 FULL DETAILS", startUrl);

    try {
      let sentMsg: any;
      if (auction.images && auction.images.length > 0) {
        sentMsg = await bot.api.sendPhoto(TELEGRAM_AUCTION_CHANNEL_ID, auction.images[0], {
          caption: channelPost,
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      } else {
        sentMsg = await bot.api.sendMessage(TELEGRAM_AUCTION_CHANNEL_ID, channelPost, {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      }

      // Save channel_message_id to database for live updates on new bids
      if (sentMsg && sentMsg.message_id) {
        await supabase
          .from("telegram_auctions")
          .update({
            channel_message_id: sentMsg.message_id,
            channel_chat_id: TELEGRAM_AUCTION_CHANNEL_ID,
          })
          .eq("id", auction.id);
      }

      await ctx.reply(`✅ Successfully published Auction #${auction.auction_number} to channel! Live updates enabled.`);
    } catch (err) {
      console.error("Failed to post to channel:", err);
      await ctx.reply(`❌ Failed to publish to channel: ${err instanceof Error ? err.message : err}`);
    }
  });

  // /participants <auction_number> [page]
  bot.command("participants", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const args = ctx.match.trim().split(" ");
    const auctionNum = args[0];
    const page = Math.max(1, parseInt(args[1] || "1", 10));

    const supabase = getBotSupabaseClient();

    if (!auctionNum) {
      // List active auctions to choose from
      const { data: activeAuctions } = await supabase
        .from("telegram_auctions")
        .select("auction_number, title")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!activeAuctions || activeAuctions.length === 0) {
        await ctx.reply("No auctions found.");
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const a of activeAuctions) {
        keyboard.text(`🔨 #${a.auction_number} — ${a.title}`, `admin_parts_${a.auction_number}_1`).row();
      }

      await ctx.reply("👥 **SELECT AUCTION TO VIEW PARTICIPANTS**", { reply_markup: keyboard });
      return;
    }

    await renderParticipantsList(ctx, auctionNum, page);
  });

  bot.callbackQuery(/^admin_parts_(.+)_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const auctionNum = ctx.match[1];
    const page = parseInt(ctx.match[2], 10);
    await renderParticipantsList(ctx, auctionNum, page);
    await ctx.answerCallbackQuery();
  });

  // /auctionstats <auction_number>
  bot.command("auctionstats", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply("❌ Unauthorized admin access.");
      return;
    }

    const auctionNum = ctx.match.trim();
    const supabase = getBotSupabaseClient();

    if (!auctionNum) {
      const { data: activeAuctions } = await supabase
        .from("telegram_auctions")
        .select("auction_number, title")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!activeAuctions || activeAuctions.length === 0) {
        await ctx.reply("No auctions found.");
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const a of activeAuctions) {
        keyboard.text(`📊 #${a.auction_number} — ${a.title}`, `admin_stats_${a.auction_number}`).row();
      }

      await ctx.reply("📊 **SELECT AUCTION TO VIEW STATISTICS**", { reply_markup: keyboard });
      return;
    }

    await renderAuctionStats(ctx, auctionNum);
  });

  bot.callbackQuery(/^admin_stats_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const auctionNum = ctx.match[1];
    await renderAuctionStats(ctx, auctionNum);
    await ctx.answerCallbackQuery();
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
      const bidder = Array.isArray(b.bidder) ? b.bidder[0] : b.bidder;
      msg += `• ${formatGHS(Number(b.amount))} by ${bidder?.full_name || "Bidder"} (${bidder?.bidder_id || "SRH"}) at ${formatShortDate(b.created_at)}\n`;
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

async function renderParticipantsList(ctx: any, auctionNum: string, page: number) {
  const supabase = getBotSupabaseClient();
  const { data: auction } = await supabase
    .from("telegram_auctions")
    .select("id, auction_number, title")
    .eq("auction_number", auctionNum)
    .maybeSingle();

  if (!auction) {
    await ctx.reply("❌ Auction not found.");
    return;
  }

  const pageSize = 5;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: participants, count: totalParticipants } = await supabase
    .from("telegram_auction_participants")
    .select(`
      joined_at, bid_count, status,
      user:auction_user_id (id, full_name, bidder_id)
    `, { count: "exact" })
    .eq("auction_id", auction.id)
    .order("joined_at", { ascending: true })
    .range(from, to);

  const { data: bids } = await supabase
    .from("telegram_auction_bids")
    .select("bidder_id, amount")
    .eq("auction_id", auction.id);

  const totalBids = bids?.length || 0;
  const uniqueBiddersCount = new Set(bids?.map((b) => b.bidder_id) || []).size;

  let msg =
    `👥 **AUCTION #${auction.auction_number} PARTICIPANTS**\n\n` +
    `📱 **${auction.title}**\n\n` +
    `👥 Participants: **${totalParticipants || 0}**\n` +
    `🔥 Actual Bidders: **${uniqueBiddersCount}**\n` +
    `💰 Total Bids: **${totalBids}**\n\n` +
    `**Participants List (Page ${page}):**\n\n`;

  if (!participants || participants.length === 0) {
    msg += "No participants joined yet.\n";
  } else {
    let index = from + 1;
    for (const p of participants as any[]) {
      const u = Array.isArray(p.user) ? p.user[0] : p.user;

      // Find highest bid by this user
      const userBids = bids?.filter((b) => b.bidder_id === u?.id) || [];
      const highestBid = userBids.length > 0 ? Math.max(...userBids.map((b) => Number(b.amount))) : 0;

      msg +=
        `${index}. **${u?.bidder_id || "SRH"}** — ${u?.full_name || "Customer"}\n` +
        `   Joined: ${formatShortDate(p.joined_at)}\n` +
        `   Bids: ${p.bid_count || 0}\n` +
        `   Highest Bid: ${highestBid > 0 ? formatGHS(highestBid) : "No bids yet"}\n\n`;
      index++;
    }
  }

  const keyboard = new InlineKeyboard();
  if (page > 1) {
    keyboard.text("⬅️ PREVIOUS", `admin_parts_${auctionNum}_${page - 1}`);
  }
  if (totalParticipants && to < totalParticipants - 1) {
    keyboard.text("NEXT ➡️", `admin_parts_${auctionNum}_${page + 1}`);
  }

  await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
}

async function renderAuctionStats(ctx: any, auctionNum: string) {
  const supabase = getBotSupabaseClient();
  const { data: auction } = await supabase
    .from("telegram_auctions")
    .select(`
      *,
      current_bidder:current_bidder_id(full_name, bidder_id)
    `)
    .eq("auction_number", auctionNum)
    .maybeSingle();

  if (!auction) {
    await ctx.reply("❌ Auction not found.");
    return;
  }

  const { count: participantCount } = await supabase
    .from("telegram_auction_participants")
    .select("*", { count: "exact", head: true })
    .eq("auction_id", auction.id);

  const { data: bids } = await supabase
    .from("telegram_auction_bids")
    .select("bidder_id, amount")
    .eq("auction_id", auction.id);

  const totalBids = bids?.length || 0;
  const uniqueBiddersCount = new Set(bids?.map((b) => b.bidder_id) || []).size;
  const avgBidsPerBidder = uniqueBiddersCount > 0 ? (totalBids / uniqueBiddersCount).toFixed(2) : "0";

  const currentBid = Number(auction.current_bid);
  const minIncrement = Number(auction.minimum_increment);
  const startingPrice = Number(auction.starting_price);
  const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;

  const currentBidderObj = Array.isArray(auction.current_bidder) ? auction.current_bidder[0] : auction.current_bidder;
  const highestBidderText = currentBidderObj ? `${currentBidderObj.bidder_id} (${currentBidderObj.full_name})` : "None yet";

  const msg =
    `📊 **AUCTION #${auction.auction_number} STATISTICS**\n\n` +
    `📱 **${auction.title}**\n\n` +
    `👥 Participants: **${participantCount || 0}**\n` +
    `🔥 Actual Bidders: **${uniqueBiddersCount}**\n` +
    `💰 Total Bids: **${totalBids}**\n\n` +
    `💵 Starting Bid: **${formatGHS(startingPrice)}**\n` +
    `🔥 Current Bid: **${currentBid === 0 ? "No bids yet" : formatGHS(currentBid)}**\n` +
    `📈 Minimum Next Bid: **${formatGHS(nextMinBid)}**\n\n` +
    `🏆 Current Highest Bidder: **${highestBidderText}**\n\n` +
    `⏰ Ends: **${formatShortDate(auction.end_time)}**\n` +
    `🔨 Status: **${auction.status.toUpperCase()}**\n\n` +
    `⏱️ Anti-Sniping Extensions: **${auction.anti_snipe_enabled ? `${auction.extension_minutes} mins` : "Disabled"}**\n` +
    `📈 Avg Bids per Bidder: **${avgBidsPerBidder}**`;

  await ctx.reply(msg, { parse_mode: "Markdown" });
}
