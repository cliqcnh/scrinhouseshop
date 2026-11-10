import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderStatus, assignProductWarranty } from "@/actions/admin/orders";

// Mocks
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    admin: {
      getUserById: vi.fn(() => Promise.resolve({
        data: { user: { email: "kofi@example.com" } },
        error: null,
      })),
    },
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
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

describe("Admin Orders Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      single: mockSingle,
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
  });

  it("updates order status successfully", async () => {
    queryResult = { error: null };

    const result = await updateOrderStatus("order-1", "processing");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: "processing" });
  });

  it("assigns product warranty successfully", async () => {
    // 1. Mock item search
    mockSingle.mockResolvedValueOnce({
      data: {
        id: "item-1",
        product_id: "prod-1",
        quantity: 1,
        order: {
          user_id: "user-1",
          delivery_address: { fullName: "Kofi", phone: "024" },
        },
      },
      error: null,
    });
    
    // 2. Mock product condition lookup
    mockSingle.mockResolvedValueOnce({
      data: { condition: "brand_new" },
      error: null,
    });

    // 3. Mock existing check
    queryResult = { data: null, error: null };

    // 4. Mock insert warranty
    mockInsert.mockReturnValueOnce({
      then: (resolve: any) => resolve({ error: null }),
    });

    const result = await assignProductWarranty("item-1", "IMEI-12345");

    expect(result.success).toBe(true);
  });
});
