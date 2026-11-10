import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryPendingOrderPayment } from "@/actions/checkout/payment-retry";

// Mocks
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({
    PAYSTACK_SECRET_KEY: "sk_test_mock_key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  })),
}));

describe("retryPendingOrderPayment server action", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    queryResult = { error: null, data: null };

    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
  });

  it("returns error if user is unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const res = await retryPendingOrderPayment("order-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("You must be signed in");
  });

  it("returns error if order does not belong to the user", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    queryResult = {
      data: {
        id: "order-1",
        status: "pending_payment",
        total: 100,
        user_id: "user-different",
        delivery_address: { fullName: "Test Name" },
      },
      error: null,
    };

    const res = await retryPendingOrderPayment("order-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Unauthorized access");
  });

  it("returns error if order status is not pending_payment", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } } });
    queryResult = {
      data: {
        id: "order-1",
        status: "paid",
        total: 100,
        user_id: "user-123",
        delivery_address: { fullName: "Test Name" },
      },
      error: null,
    };

    const res = await retryPendingOrderPayment("order-1");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Payment cannot be processed for an order with status \"paid\"");
  });

  it("initializes Paystack payment and updates order reference on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-123", email: "user@example.com" } } });
    queryResult = {
      data: {
        id: "order-1",
        status: "pending_payment",
        total: 150.50,
        user_id: "user-123",
        delivery_address: { fullName: "Kofi Mensah" },
      },
      error: null,
    };

    const mockFetch = vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { authorization_url: "https://checkout.paystack.com/mock-session" },
      }),
    } as Response);

    const res = await retryPendingOrderPayment("order-1");
    expect(res.success).toBe(true);
    expect(res.authorizationUrl).toBe("https://checkout.paystack.com/mock-session");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/initialize",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"amount":15050'), // 150.50 GHS to pesewas (15050)
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      paystack_ref: expect.stringMatching(/^SCR-RETRY-/),
    }));
  });
});
