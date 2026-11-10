import { NextRequest, NextResponse } from "next/server";
import { processEndedAuctions } from "@/telegram-bot/services/auction-closer";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processEndedAuctions();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Telegram ended auctions processed successfully.",
    });
  } catch (err) {
    console.error("Cron telegram-auctions failure:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failure" },
      { status: 500 }
    );
  }
}
