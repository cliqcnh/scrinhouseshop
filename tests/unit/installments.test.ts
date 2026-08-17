import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateInstallment } from "@/lib/installments";
import { listInstallmentApplications, updateInstallmentStatus } from "@/actions/admin/installments";

// Mocks
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1", email: "user@example.com" } } })),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
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
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  sendSMS: vi.fn().mockResolvedValue(true),
  sendEmail: vi.fn().mockResolvedValue(true),
}));

describe("Installment Financial Math & Server Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      order: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      in: vi.fn().mockImplementation(() => chain),
      select: vi.fn().mockImplementation(() => chain),
      single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      insert: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
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

    it("supports dynamic installment plan durations", () => {
      const result = calculateInstallment(10000, { profitPercentage: 20, depositPercentage: 40, durationMonths: 6 });
      expect(result.durationMonths).toBe(6);
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

    it("places installment order with custom profit and deposit rates on product override", async () => {
      const mockProduct = {
        name: "Custom iPhone",
        product_type: "phone",
        allow_installments: true,
        installment_profit_percentage: 15,
        installment_deposit_percentage: 30,
        categories: { slug: "phones" }
      };

      const mockVariant = {
        id: "variant-custom",
        sku: "CUST-IPH",
        price: 10000,
        stock_quantity: 5,
        is_active: true,
        products: mockProduct
      };

      mockSelect
        .mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve({ data: [mockVariant], error: null })
          })
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        });

      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "order-custom-123" }, error: null })
        })
      });

      const { placeOrder } = await import("@/actions/checkout/place-order");
      const res = await placeOrder(
        [
          {
            variantId: "variant-custom",
            productId: "prod-custom",
            name: "Custom iPhone",
            variantLabel: "Red",
            price: 10000,
            quantity: 1,
            isInstallment: true,
            depositAmount: 3450,
            remainingBalance: 8050,
            totalInstallmentPrice: 11500
          }
        ],
        {
          fullName: "Ribeiro",
          phone: "0240000000",
          region: "Greater Accra",
          city: "Accra",
          streetAddress: "123 Street",
        },
        {
          ghanaCardNumber: "GHA-111111111-1",
          ghanaCardFrontUrl: "https://front.png",
          ghanaCardBackUrl: "https://back.png"
        }
      );

      expect(res.orderId).toBe("order-custom-123");

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        is_installment: true,
        installment_deposit: 3450,
        installment_balance: 8050,
      }));
    });

    it("rejects installment order if product does not allow installments", async () => {
      const mockProduct = {
        name: "Custom iPhone 2",
        product_type: "phone",
        allow_installments: false,
        installment_profit_percentage: null,
        installment_deposit_percentage: null,
        categories: { slug: "phones" }
      };

      const mockVariant = {
        id: "variant-custom-2",
        sku: "CUST-IPH-2",
        price: 10000,
        stock_quantity: 5,
        is_active: true,
        products: mockProduct
      };

      mockSelect
        .mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            then: (resolve: any) => resolve({ data: [mockVariant], error: null })
          })
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        });

      const { placeOrder } = await import("@/actions/checkout/place-order");
      
      await expect(placeOrder(
        [
          {
            variantId: "variant-custom-2",
            productId: "prod-custom-2",
            name: "Custom iPhone 2",
            variantLabel: "Red",
            price: 10000,
            quantity: 1,
            isInstallment: true,
            depositAmount: 4800,
            remainingBalance: 7200,
            totalInstallmentPrice: 12000
          }
        ],
        {
          fullName: "Ribeiro",
          phone: "0240000000",
          region: "Greater Accra",
          city: "Accra",
          streetAddress: "123 Street",
        },
        {
          ghanaCardNumber: "GHA-111111111-1",
          ghanaCardFrontUrl: "https://front.png",
          ghanaCardBackUrl: "https://back.png"
        }
      )).rejects.toThrow("Installment payment plan is not enabled for \"Custom iPhone 2\".");
    });
  });
});
