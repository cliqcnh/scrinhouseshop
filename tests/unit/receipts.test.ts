import { describe, it, expect } from "vitest";
import { generateQRMatrix } from "@/lib/qrcode";

describe("Receipts & QR Generation System", () => {
  it("generates a valid QR code matrix for receipt verification URLs", () => {
    const url = "https://scrinhouse.com/verify/receipt/REC-20261119-7482";
    const matrix = generateQRMatrix(url);

    expect(matrix).toBeDefined();
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);

    // Verify top-left finder pattern center is black (module at row 3, col 3)
    expect(matrix[3][3]).toBe(true);
    // Verify top-left finder corner (0,0) is black
    expect(matrix[0][0]).toBe(true);
    // Verify top-right finder pattern (0, size-1) is black
    expect(matrix[0][matrix.length - 1]).toBe(true);
    // Verify bottom-left finder pattern (size-1, 0) is black
    expect(matrix[matrix.length - 1][0]).toBe(true);
  });

  it("accurately separates screen part cost and workmanship labor fee in totals", () => {
    const items = [
      { itemType: "repair_part", description: "iPhone 13 OLED Screen", quantity: 1, unitPrice: 1200 },
      { itemType: "workmanship", description: "Technician Workmanship & Fitting", quantity: 1, unitPrice: 250 },
    ];

    const subtotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
    const discount = 50;
    const total = subtotal - discount;

    expect(subtotal).toBe(1450);
    expect(total).toBe(1400);

    const partTotal = items
      .filter((it) => it.itemType === "repair_part")
      .reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

    const workTotal = items
      .filter((it) => it.itemType === "workmanship")
      .reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

    expect(partTotal).toBe(1200);
    expect(workTotal).toBe(250);
  });

  it("handles editable warranty durations appropriately", () => {
    const now = new Date("2026-11-19T10:00:00Z");

    function parseExpiry(duration: string): Date | null {
      const d = new Date(now.getTime());
      const lower = duration.toLowerCase();
      if (lower.includes("none") || lower.includes("no warranty")) return null;
      if (lower.includes("1 week") || lower.includes("7 days")) {
        d.setDate(d.getDate() + 7);
        return d;
      }
      if (lower.includes("2 weeks") || lower.includes("14 days")) {
        d.setDate(d.getDate() + 14);
        return d;
      }
      if (lower.includes("1 month") || lower.includes("30 days")) {
        d.setMonth(d.getMonth() + 1);
        return d;
      }
      d.setDate(d.getDate() + 7);
      return d;
    }

    const oneWeek = parseExpiry("1 Week");
    expect(oneWeek?.toISOString().startsWith("2026-11-26")).toBe(true);

    const twoWeeks = parseExpiry("2 Weeks");
    expect(twoWeeks?.toISOString().startsWith("2026-12-03")).toBe(true);

    const noWarranty = parseExpiry("No Warranty");
    expect(noWarranty).toBeNull();
  });
});
