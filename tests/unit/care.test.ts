import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCareClaim } from "@/actions/admin/care";
import { subscribeToCarePlan } from "@/actions/storefront/care";

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

let currentTable = "";
const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1", email: "user@example.com" } } })),
  },
  from: vi.fn((table) => {
    currentTable = table;
    return {
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    };
  }),
};

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve({ isStaff: true })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({
    PAYSTACK_SECRET_KEY: "sk_test_mock_key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("ScrinHouse Care Protection Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };
    currentTable = "";

    const chain: any = {
      order: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
      select: vi.fn().mockImplementation(() => chain),
      single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      maybeSingle: vi.fn().mockImplementation(() => {
        if (currentTable === "care_claims") {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve(queryResult);
      }),
      insert: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((resolve) => {
        if (currentTable === "care_claims") {
          return resolve({ data: [], error: null });
        }
        return resolve(queryResult);
      }),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
  });

  it("subscribes to a care plan successfully", async () => {
    queryResult = {
      data: {
        id: "tier-1",
        price: 39,
      },
      error: null,
    };

    const result = await subscribeToCarePlan({
      tierId: "tier-1",
      imeiSerial: "357124098765432",
      deviceModel: "iPhone 14 Pro Max",
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      device_model: "iPhone 14 Pro Max",
      imei_serial: "357124098765432",
      status: "pending_payment",
    }));
  });

  it("refuses repair claims if within the 2-month waiting period", async () => {
    // Starts 10 days ago (less than 60 days)
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    queryResult = {
      data: {
        id: "sub-1",
        status: "active",
        starts_at: tenDaysAgo.toISOString(),
        ends_at: new Date().toISOString(),
        care_tiers: {
          slug: "care-standard",
          screen_limit: 1,
          screen_copay_percentage: 40.00,
        },
      },
      error: null,
    };

    const result = await registerCareClaim({
      subscriptionId: "sub-1",
      claimType: "screen",
      partCost: 500,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("first 2 months of subscription");
  });

  it("calculates co-pay and excess correctly on parts exceeding GH₵ 1,000 threshold", async () => {
    // Active since 70 days ago (exceeds 60-day wait period limit)
    const seventyDaysAgo = new Date();
    seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 70);

    queryResult = {
      data: {
        id: "sub-1",
        status: "active",
        starts_at: seventyDaysAgo.toISOString(),
        ends_at: new Date().toISOString(),
        care_tiers: {
          slug: "care-standard",
          screen_limit: 1,
          screen_copay_percentage: 40.00, // 40% co-pay (covers 60% of first 1,000 GHS)
        },
      },
      error: null,
    };

    const result = await registerCareClaim({
      subscriptionId: "sub-1",
      claimType: "screen",
      partCost: 1400, // costs 1,400 GHS
    });

    expect(result.success).toBe(true);
    // Part cost is 1,400.
    // Ceiling is 1,000. So excess is 400.
    // Covered part of 1,000 is co-paid at 40% -> 400.
    // Total customer pays: 400 co-pay + 400 excess = 800.
    expect(result.coPayPaid).toBe(400);
    expect(result.excessPaid).toBe(400);
  });
});
