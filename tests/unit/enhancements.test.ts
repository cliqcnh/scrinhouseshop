import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateTradeInValue } from "@/lib/trade-in";
import { validateCoupon } from "@/actions/storefront/coupons";
import { createProductReview } from "@/actions/storefront/reviews";

// Mocks
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockMaybeSingle = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("5 Enhancements Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Trade-In Valuation Math", () => {
    it("calculates pristine iPhone 14 valuation correctly", () => {
      const val = calculateTradeInValue({
        brand: "Apple",
        model: "iPhone 14",
        storage: "128GB",
        screenCondition: "flawless",
        bodyCondition: "clean",
        batteryHealth: "good",
      });
      expect(val).toBe(6500);
    });

    it("applies storage bonus and screen/body deductions", () => {
      const val = calculateTradeInValue({
        brand: "Apple",
        model: "iPhone 14",
        storage: "256GB", // 6500 * 1.1 = 7150
        screenCondition: "scratched", // 7150 * 0.85 = 6077.5
        bodyCondition: "light_wear", // 6077.5 * 0.92 = 5591.3
        batteryHealth: "good",
      });
      expect(val).toBe(5600); // rounded to nearest 50
    });
  });

  describe("Coupon Validation Action", () => {
    it("validates percentage coupon code correctly", async () => {
      const chain: any = {
        eq: vi.fn().mockImplementation(() => chain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            code: "WELCOME10",
            discount_type: "percentage",
            discount_value: 10,
            min_order_amount: 100,
            is_active: true,
          },
          error: null,
        }),
      };
      mockSelect.mockReturnValue(chain);

      const res = await validateCoupon("WELCOME10", 1000);
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(100);
    });

    it("rejects coupon if subtotal is below minimum order amount", async () => {
      const chain: any = {
        eq: vi.fn().mockImplementation(() => chain),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            code: "MIN200",
            discount_type: "fixed",
            discount_value: 50,
            min_order_amount: 200,
            is_active: true,
          },
          error: null,
        }),
      };
      mockSelect.mockReturnValue(chain);

      const res = await validateCoupon("MIN200", 150);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Minimum order total");
    });
  });

  describe("Customer Reviews Action", () => {
    it("submits product review successfully", async () => {
      mockInsert.mockReturnValue(Promise.resolve({ error: null }));

      const res = await createProductReview({
        productId: "prod-1",
        userName: "Kofi",
        rating: 5,
        title: "Great Phone!",
        comment: "Excellent battery health.",
      });

      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        product_id: "prod-1",
        rating: 5,
        title: "Great Phone!",
      }));
    });
  });
});
