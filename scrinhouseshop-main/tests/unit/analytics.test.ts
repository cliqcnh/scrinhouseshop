import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFinancialAuditData } from "@/actions/admin/analytics";

// Helper for mocked supabase method chains
function createMockChain(result: any) {
  const chain = {
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    then: (resolve: any) => Promise.resolve(resolve(result)),
  };
  return chain;
}

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve()),
}));

describe("Financial Audit Analytics Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
  });

  it("consolidates orders, repairs, wallet transactions and payout requests", async () => {
    // 1. Mock Orders search results
    const mockOrders = [
      {
        id: "order-1",
        created_at: "2026-08-01T10:00:00Z",
        total: 1200.00,
        status: "delivered",
        delivery_address: { fullName: "Kofi Mensah" },
        wallet_amount_applied: 0.00,
      },
      {
        id: "order-2",
        created_at: "2026-08-02T11:00:00Z",
        total: 800.00,
        status: "refunded",
        delivery_address: { fullName: "Ama Serwaa" },
        wallet_amount_applied: 100.00,
      }
    ];

    // 2. Mock Repair search results
    const mockRepairs = [
      {
        id: "repair-1",
        created_at: "2026-08-03T12:00:00Z",
        estimated_amount: 350.00,
        status: "completed",
        customer_name: "Yao Boateng",
        device_model: "iPhone 12",
      }
    ];

    // 3. Mock Wallet transaction logs
    const mockWalletTxs = [
      {
        id: "wallet-tx-1",
        created_at: "2026-08-04T13:00:00Z",
        amount: 50.00,
        type: "referral_reward",
        description: "Referral reward for first completed purchase",
        profiles: { display_name: "Referrer Joe" }
      }
    ];

    // 4. Mock Payout withdrawal requests
    const mockWithdrawals = [
      {
        id: "payout-1",
        created_at: "2026-08-05T14:00:00Z",
        amount: 200.00,
        status: "paid",
        payment_method: "momo",
        profiles: { display_name: "User Yao" }
      }
    ];

    // Wire mocks to Supabase chained calls sequentially
    mockSupabase.from
      .mockReturnValueOnce(createMockChain({ data: mockOrders, error: null }))
      .mockReturnValueOnce(createMockChain({ data: mockRepairs, error: null }))
      .mockReturnValueOnce(createMockChain({ data: mockWalletTxs, error: null }))
      .mockReturnValueOnce(createMockChain({ data: mockWithdrawals, error: null }));

    const res = await getFinancialAuditData({});

    expect(res.totalSales).toBe(400); // 1200 (inflow) - 800 (refund outflow) = 400
    expect(res.totalRepairs).toBe(350); // 350 (inflow)
    expect(res.totalWalletTransactions).toBe(50); // 50 (inflow)
    expect(res.totalPayouts).toBe(200); // 200 (outflow)

    expect(res.events.length).toBe(5);

    // Verify chronological order (newest date first)
    expect(res.events[0]?.id).toBe("payout-1");
    expect(res.events[1]?.id).toBe("wallet-tx-1");
    expect(res.events[2]?.id).toBe("repair-1");
  });
});
