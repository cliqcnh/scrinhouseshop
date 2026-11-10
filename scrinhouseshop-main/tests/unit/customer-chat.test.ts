import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  submitProductEnquiry, 
  listCustomerEnquiries, 
  getCustomerEnquiryMessages, 
  sendCustomerMessage 
} from "@/actions/storefront/enquiry";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null as unknown as { id: string; email: string } | null } })),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Customer In-App Support Chat Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
  });

  describe("submitProductEnquiry with session token", () => {
    it("sets session_token and user_id if logged in", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com" } },
      });

      const mockChainSingle = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "enquiry-abc" },
          error: null,
        }),
      };

      mockInsert
        .mockReturnValueOnce(mockChainSingle)
        .mockResolvedValueOnce({ error: null });

      const res = await submitProductEnquiry(
        "prod-123",
        {
          name: "Kofi Mensah",
          email: "kofi@example.com",
          phone: "0208204749",
          message: "Tell me more about iPhone 15",
        },
        "session-xyz"
      );

      expect(res.success).toBe(true);
      expect(res.enquiryId).toBe("enquiry-abc");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: "prod-123",
          user_id: "user-123",
          session_token: "session-xyz",
        })
      );
    });
  });

  describe("listCustomerEnquiries", () => {
    it("lists enquiries matching session token for guest users", async () => {
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
              created_at: "2026-08-03T12:00:00Z",
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

      const mockOr = {
        or: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col, val) => {
          expect(col).toBe("session_token");
          expect(val).toBe("session-xyz");
          return mockChainOrder;
        }),
      };

      mockSelect.mockReturnValue(mockOr);

      const list = await listCustomerEnquiries("session-xyz");

      expect(list).toHaveLength(1);
      expect(list[0].productName).toBe("iPhone 15 Pro");
      expect(list[0].status).toBe("pending");
    });
  });

  describe("getCustomerEnquiryMessages and ownership validation", () => {
    it("refuses access if the user doesn't own the enquiry", async () => {
      const mockChainSingle = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: "another-user",
            session_token: "another-session",
          },
          error: null,
        }),
      };

      mockSelect.mockReturnValueOnce(mockChainSingle);

      const msgs = await getCustomerEnquiryMessages("enq-123", "my-session-token");
      expect(msgs).toHaveLength(0); // returns empty array on access denied
    });

    it("returns messages if matching session token", async () => {
      const mockChainSingle = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: null,
            session_token: "my-session-token",
          },
          error: null,
        }),
      };

      const mockChainOrder = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "msg-1",
              enquiry_id: "enq-123",
              sender: "admin",
              message: "Hello from admin",
              created_at: "2026-08-03T12:05:00Z",
            },
          ],
          error: null,
        }),
      };

      mockSelect
        .mockReturnValueOnce(mockChainSingle) // first call verifies owner
        .mockReturnValueOnce(mockChainOrder); // second call fetches messages

      const msgs = await getCustomerEnquiryMessages("enq-123", "my-session-token");
      expect(msgs).toHaveLength(1);
      expect(msgs[0].message).toBe("Hello from admin");
      expect(msgs[0].sender).toBe("admin");
    });
  });

  describe("sendCustomerMessage", () => {
    it("verifies ownership, inserts message, and updates status to pending", async () => {
      const mockChainSingle = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            user_id: null,
            session_token: "my-session-token",
          },
          error: null,
        }),
      };

      mockSelect.mockReturnValueOnce(mockChainSingle);
      mockInsert.mockResolvedValueOnce({ error: null }); // insert reply
      
      const mockChainUpdate = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockUpdate.mockReturnValueOnce(mockChainUpdate); // update status

      const res = await sendCustomerMessage("enq-123", "Thank you, that helps!", "my-session-token");
      
      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          enquiry_id: "enq-123",
          sender: "customer",
          message: "Thank you, that helps!",
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
        })
      );
    });
  });
});
