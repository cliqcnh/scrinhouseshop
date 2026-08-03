import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitProductEnquiry } from "@/actions/storefront/enquiry";
import { listEnquiries, getEnquiryMessages, replyToEnquiry } from "@/actions/admin/enquiries";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createServiceRoleClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve({ id: "staff-123", email: "admin@scrinhouse.com" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Product Enquiries & Messaging Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  });

  describe("submitProductEnquiry (customer)", () => {
    it("inserts the enquiry and the initial message successfully", async () => {
      const mockChainSingle = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "enquiry-123" },
          error: null,
        }),
      };

      mockInsert
        // first insert call for public.product_enquiries
        .mockReturnValueOnce(mockChainSingle)
        // second insert call for public.product_enquiry_messages
        .mockResolvedValueOnce({ error: null });

      const res = await submitProductEnquiry("prod-456", {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "233200000000",
        message: "Is this phone in stock?",
      });

      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("product_enquiries");
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        product_id: "prod-456",
        customer_name: "Jane Doe",
      }));
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        enquiry_id: "enquiry-123",
        sender: "customer",
        message: "Is this phone in stock?",
      }));
    });

    it("returns validation error for invalid emails", async () => {
      const res = await submitProductEnquiry("prod-456", {
        name: "Jane Doe",
        email: "not-an-email",
        phone: "233200000000",
        message: "Hi",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid email address");
    });
  });

  describe("listEnquiries (admin)", () => {
    it("returns mapped listing of enquiries", async () => {
      const mockChainOrder = {
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "enq-1",
              product_id: "prod-1",
              customer_name: "Kofi",
              customer_email: "kofi@example.com",
              customer_phone: "0208204749",
              status: "pending",
              created_at: "2026-07-29T15:00:00Z",
              products: {
                id: "prod-1",
                name: "iPhone 15 Pro",
                slug: "iphone-15-pro",
                product_images: [{ url: "https://example.com/img.png", is_primary: true }],
              },
            },
          ],
          error: null,
        }),
      };

      mockSelect.mockReturnValue(mockChainOrder);

      const list = await listEnquiries();

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(expect.objectContaining({
        id: "enq-1",
        productName: "iPhone 15 Pro",
        productImageUrl: "https://example.com/img.png",
        customerName: "Kofi",
      }));
    });
  });

  describe("replyToEnquiry (admin)", () => {
    it("inserts admin message and updates status to replied", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const res = await replyToEnquiry("enq-123", "We have it in stock!");

      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        enquiry_id: "enq-123",
        sender: "admin",
        message: "We have it in stock!",
      }));
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: "replied",
      }));
    });
  });
});
