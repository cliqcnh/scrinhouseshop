import { Bot, Keyboard, InlineKeyboard, Context } from "grammy";
import { getBotSupabaseClient } from "../supabase";
import { TelegramAuctionUser } from "../types";

// In-memory registration steps for state tracking
interface RegistrationState {
  step: "awaiting_name" | "awaiting_phone";
  fullName?: string;
}

const userRegistrationStates = new Map<number, RegistrationState>();

export function getMainMenuKeyboard() {
  return new Keyboard()
    .text("🔨 Active Auctions").text("📅 Upcoming Auctions").row()
    .text("🔨 My Auctions").text("💰 My Bids").row()
    .text("🏆 My Wins").text("👤 My Account").row()
    .text("📜 Auction Rules").text("💬 Support")
    .resized();
}

export function registerRegistrationHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const supabase = getBotSupabaseClient();
    const { data: existingUser } = await supabase
      .from("telegram_auction_users")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (existingUser) {
      const user = existingUser as TelegramAuctionUser;
      await ctx.reply(
        `🔨 Welcome back to Scrinhouse Auctions, ${user.full_name}!\n\n` +
        `Your Bidder ID: **${user.bidder_id}**\n\n` +
        `Use the menu below to browse active auctions, place bids, or check your account.`,
        { parse_mode: "Markdown", reply_markup: getMainMenuKeyboard() }
      );
      return;
    }

    userRegistrationStates.set(telegramId, { step: "awaiting_name" });

    await ctx.reply(
      "🔨 Welcome to Scrinhouse Auctions!\n\n" +
      "This is the official Scrinhouse auction bot where you can bid on phones, electronics and special deals.\n\n" +
      "Let's get you registered.\n\n" +
      "Please enter your **Full Name** to begin:"
    );
  });

  // Message listener for registration text & contact
  bot.on("message", async (ctx, next) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const state = userRegistrationStates.get(telegramId);
    if (!state) return next();

    // Check if handling contact button
    if (ctx.message.contact && state.step === "awaiting_phone") {
      const phone = ctx.message.contact.phone_number;
      await completeRegistration(ctx, telegramId, state.fullName || "Customer", phone);
      userRegistrationStates.delete(telegramId);
      return;
    }

    const text = ctx.message.text?.trim();
    if (!text) return next();

    // Ignore menu commands if user clicks a main menu button mid-registration
    if (["🔨 Active Auctions", "📅 Upcoming Auctions", "💰 My Bids", "🏆 My Wins", "👤 My Account", "📜 Auction Rules", "💬 Support"].includes(text)) {
      userRegistrationStates.delete(telegramId);
      return next();
    }

    if (state.step === "awaiting_name") {
      if (text.length < 2) {
        await ctx.reply("Please enter a valid full name (at least 2 characters):");
        return;
      }
      state.fullName = text;
      state.step = "awaiting_phone";
      userRegistrationStates.set(telegramId, state);

      const phoneKeyboard = new Keyboard()
        .requestContact("📱 Share Phone Number")
        .resized()
        .oneTime();

      await ctx.reply(
        `Thank you, ${text}!\n\n` +
        "Now, please provide your **Phone Number** (e.g. 024XXXXXXX) or tap the button below to share contact:",
        { reply_markup: phoneKeyboard }
      );
      return;
    }

    if (state.step === "awaiting_phone") {
      if (text.length < 9) {
        await ctx.reply("Please enter a valid phone number:");
        return;
      }
      await completeRegistration(ctx, telegramId, state.fullName || "Customer", text);
      userRegistrationStates.delete(telegramId);
      return;
    }

    return next();
  });
}

async function completeRegistration(
  ctx: Context,
  telegramId: number,
  fullName: string,
  phone: string
) {
  const supabase = getBotSupabaseClient();
  const telegramUsername = ctx.from?.username || null;

  // Insert into telegram_auction_users (DB trigger generates bidder_id like SRH001)
  const { data: newUser, error } = await supabase
    .from("telegram_auction_users")
    .insert({
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      full_name: fullName,
      phone: phone,
    })
    .select()
    .single();

  if (error || !newUser) {
    console.error("Error inserting telegram_auction_user:", error);
    await ctx.reply("❌ Registration failed. Please try again with /start.");
    return;
  }

  const user = newUser as TelegramAuctionUser;

  await ctx.reply(
    `✅ REGISTRATION COMPLETE!\n\n` +
    `Your Bidder ID: **${user.bidder_id}**\n` +
    `Name: ${user.full_name}\n` +
    `Phone: ${user.phone}\n\n` +
    `You are all set to participate in Scrinhouse Auctions!`,
    { parse_mode: "Markdown", reply_markup: getMainMenuKeyboard() }
  );
}
