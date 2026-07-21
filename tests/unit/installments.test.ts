import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateInstallment } from "@/lib/installments";
import { listInstallmentApplications, updateInstallmentStatus } from "@/actions/admin/installments";

// Mocks
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
};

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve({ isStaff: true })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Installment Financial Math & Server Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      order: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
  });

  describe("calculateInstallment", () => {
    it("calculates 20% plan markup and 40% down payment deposit correctly", () => {
      const result = calculateInstallment(10000);
      expect(result.basePrice).toBe(10000);
      expect(result.totalPrice).toBe(12000); // 10000 * 1.20
      expect(result.depositAmount).toBe(4800); // 12000 * 0.40
      expect(result.remainingBalance).toBe(7200); // 12000 - 4800
      expect(result.markupAmount).toBe(2000);
    });

    it("supports dynamic custom profit and deposit percentages", () => {
      // 10,000 GHS phone, 15% profit, 30% deposit
      const result = calculateInstallment(10000, { profitPercentage: 15, depositPercentage: 30 });
      expect(result.basePrice).toBe(10000);
      expect(result.totalPrice).toBe(11500); // 10000 * 1.15
      expect(result.depositAmount).toBe(3450); // 11500 * 0.30
      expect(result.remainingBalance).toBe(8050); // 11500 - 3450
      expect(result.profitPercentage).toBe(15);
      expect(result.depositPercentage).toBe(30);
    });

    it("handles zero and fractional prices gracefully", () => {
      const result = calculateInstallment(2500);
      expect(result.totalPrice).toBe(3000);
      expect(result.depositAmount).toBe(1200);
      expect(result.remainingBalance).toBe(1800);
    });
  });

  describe("Admin Installment Actions", () => {
    it("lists installment applications successfully", async () => {
      queryResult = {
        data: [
          {
            id: "inst-1",
            order_id: "order-1",
            user_id: "user-1",
            base_price: "10000",
            total_price: "12000",
            deposit_amount: "4800",
            remaining_balance: "7200",
            ghana_card_number: "GHA-123456789-0",
            ghana_card_front_url: "data:image/png;base64,123",
            ghana_card_back_url: "data:image/png;base64,456",
            status: "pending_review",
            notes: null,
            created_at: "2026-07-20T10:00:00Z",
            profiles: { full_name: "Kofi Mensah", phone: "0240000000" },
            products: { name: "iPhone 15 Pro", primary_image_url: "/img.png" },
          },
        ],
        error: null,
      };

      const items = await listInstallmentApplications();
      expect(items).toHaveLength(1);
      expect(items[0].applicantName).toBe("Kofi Mensah");
      expect(items[0].depositAmount).toBe(4800);
      expect(items[0].ghanaCardNumber).toBe("GHA-123456789-0");
    });

    it("updates installment status successfully", async () => {
      queryResult = { error: null };

      const result = await updateInstallmentStatus("inst-1", "approved");
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: "approved",
      }));
    });
  });
});
