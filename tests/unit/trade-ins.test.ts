import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTradeInStatus } from "@/actions/admin/trade-ins";
import { acceptTradeInValuation } from "@/actions/storefront/trade-in";
import { getCustomerTradeInRequests } from "@/actions/storefront/dashboard";

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

describe("Trade-In Workflow Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      order: vi.fn().mockImplementation(() => chain),
      eq: vi.fn().mockImplementation(() => chain),
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

  it("updates trade-in status and sets quote as admin successfully", async () => {
    const result = await updateTradeInStatus("trade-1", "valued", 1500);
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "valued",
      estimated_value: 1500,
    }));
  });

  it("accepts trade-in valuation as customer successfully", async () => {
    const result = await acceptTradeInValuation("trade-1");
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "accepted",
    }));
  });

  it("gets customer trade-in requests successfully", async () => {
    queryResult = {
      data: [
        {
          id: "trade-1",
          brand: "Apple",
          model: "iPhone 13",
          storage: "128GB",
          condition_grade: "good",
          screen_condition: "flawless",
          battery_health: "good",
          estimated_value: "1500",
          contact_phone: "0240000000",
          status: "valued",
          created_at: "2026-08-17T00:00:00Z",
        }
      ],
      error: null,
    };

    const requests = await getCustomerTradeInRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].model).toBe("iPhone 13");
    expect(requests[0].estimatedValue).toBe(1500);
    expect(requests[0].status).toBe("valued");
  });
});
