import { loadEnvConfig } from "@next/env";

// Ensure environment variables from .env.local and .env are loaded when running via CLI/tsx
loadEnvConfig(process.cwd());

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const TELEGRAM_AUCTION_CHANNEL_ID = process.env.TELEGRAM_AUCTION_CHANNEL_ID || "";
export const TELEGRAM_ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
export const NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function validateConfig() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("⚠️ Warning: TELEGRAM_BOT_TOKEN environment variable is missing.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("⚠️ Warning: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
}

