import { Bot } from "grammy";
import { TELEGRAM_BOT_TOKEN, validateConfig } from "./config";
import { registerRegistrationHandlers } from "./handlers/registration";
import { registerAuctionHandlers } from "./handlers/auctions";
import { registerAccountHandlers } from "./handlers/account";
import { registerAdminHandlers } from "./handlers/admin";
import { processEndedAuctions } from "./services/auction-closer";

validateConfig();

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ Cannot start Telegram bot: TELEGRAM_BOT_TOKEN is not defined in environment variables.");
  process.exit(1);
}

export const bot = new Bot(TELEGRAM_BOT_TOKEN);

// Register handler modules
registerRegistrationHandlers(bot);
registerAuctionHandlers(bot);
registerAccountHandlers(bot);
registerAdminHandlers(bot);

// Catch-all error handler
bot.catch((err) => {
  console.error("Unhandled Telegram Bot Error:", err.error || err);
});

// Periodic background runner: process ended auctions every 10 seconds
setInterval(() => {
  processEndedAuctions(bot).catch((err) => {
    console.error("Error in processEndedAuctions periodic background task:", err);
  });
}, 10000);

// Export start function
export async function startBot() {
  console.log("🚀 Scrinhouse Telegram Auction Bot starting...");
  await bot.start({
    onStart(botInfo) {
      console.log(`✅ Scrinhouse Auction Bot online as @${botInfo.username}!`);
    },
  });
}

// Auto-run if executed directly via node/tsx
if (require.main === module) {
  startBot();
}
