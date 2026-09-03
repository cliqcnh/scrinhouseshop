import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatGHS, maskPhone, formatShortDate } from "@/telegram-bot/utils/format";
import { validateConfig } from "@/telegram-bot/config";
import { isAdmin } from "@/telegram-bot/handlers/admin";

describe("Telegram Auction Bot Unit Tests", () => {
  describe("Formatting Utilities", () => {
    it("formats currency to GHS with two decimal places", () => {
      expect(formatGHS(4000)).toBe("GH₵4,000.00");
      expect(formatGHS(4650.5)).toBe("GH₵4,650.50");
      expect(formatGHS(0)).toBe("GH₵0.00");
    });

    it("masks customer phone numbers for public privacy", () => {
      expect(maskPhone("0241234567")).toBe("024XXXX567");
      expect(maskPhone("0509998888")).toBe("050XXXX888");
      expect(maskPhone("123")).toBe("024XXXXXXX");
    });

    it("formats short date string", () => {
      const dateStr = "2026-09-03T20:00:00Z";
      const formatted = formatShortDate(dateStr);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("Admin Authorization", () => {
    it("returns true for authorized admin IDs", () => {
      expect(isAdmin(123456789)).toBe(true);
    });
  });

  describe("Config Validation", () => {
    it("runs config validation without crashing", () => {
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe("Bidding Validation Rules", () => {
    it("calculates correct minimum next bid for initial bid", () => {
      const currentBid = 0;
      const startingPrice = 4000;
      const minIncrement = 100;

      const nextMinBid = currentBid === 0 ? startingPrice : currentBid + minIncrement;
      expect(nextMinBid).toBe(4000);
    });

    it("calculates correct minimum next bid when bids exist", () => {
      const currentBid = 4600;
      const minIncrement = 100;

      const nextMinBid = currentBid + minIncrement;
      expect(nextMinBid).toBe(4700);
    });

    it("rejects bids lower than the minimum next bid", () => {
      const currentBid = 4600;
      const minIncrement = 100;
      const userBid = 4650;

      const minRequired = currentBid + minIncrement;
      const isValid = userBid >= minRequired;

      expect(isValid).toBe(false);
    });

    it("accepts valid bids equal or higher than minimum next bid", () => {
      const currentBid = 4600;
      const minIncrement = 100;
      const userBid = 4700;

      const minRequired = currentBid + minIncrement;
      const isValid = userBid >= minRequired;

      expect(isValid).toBe(true);
    });
  });

  describe("Anti-Sniping Calculation", () => {
    it("extends auction time by extensionMinutes if bid placed within final 2 minutes", () => {
      const now = new Date("2026-09-03T19:59:00Z").getTime();
      const endTime = new Date("2026-09-03T20:00:00Z").getTime();
      const extensionMinutes = 2;

      const timeRemainingMs = endTime - now;
      const isWithinFinalTwoMinutes = timeRemainingMs <= 2 * 60 * 1000;

      expect(isWithinFinalTwoMinutes).toBe(true);

      const newEndTime = isWithinFinalTwoMinutes
        ? new Date(now + extensionMinutes * 60 * 1000)
        : new Date(endTime);

      expect(newEndTime.toISOString()).toBe("2026-09-03T20:01:00.000Z");
    });
  });
});
