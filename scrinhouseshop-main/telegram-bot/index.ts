import http from "node:http";
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

// Catch-all grammY error handler
bot.catch((err) => {
  console.error("Unhandled Telegram Bot Error:", err.error || err);
});

// Periodic background runner: process ended auctions every 10 seconds
const tickerInterval = setInterval(() => {
  processEndedAuctions(bot).catch((err) => {
    console.error("Error in processEndedAuctions periodic background task:", err);
  });
}, 10000);

// Production Health Check HTTP Server for PaaS platforms (Render, Railway, Fly.io, etc.)
const PORT = process.env.PORT || 8080;
const healthServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "online",
        service: "Scrinhouse Telegram Auction Bot",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// Graceful Shutdown Handler
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Shutting down Telegram bot gracefully...`);

  clearInterval(tickerInterval);

  try {
    await bot.stop();
    console.log("✅ Telegram polling stopped.");
  } catch (err) {
    console.error("Error stopping Telegram bot:", err);
  }

  healthServer.close(() => {
    console.log("✅ Health check server stopped.");
    process.exit(0);
  });

  // Force exit after 5s if server hanging
  setTimeout(() => process.exit(0), 5000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Global unhandled error resilience
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
});

// Export start function
export async function startBot() {
  healthServer.listen(PORT, () => {
    console.log(`🌐 Health check server listening on port ${PORT}`);
  });

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
