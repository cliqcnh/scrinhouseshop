import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateRepairBooking, saveRepairEstimate, deleteRepairEstimate } from "@/actions/admin/repairs";

// Mocks
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
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

describe("Admin Repairs Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "booking-1",
          customer_name: "Kofi Mensah",
          customer_phone: "0241234567",
          customer_email: "kofi@example.com",
          device_model: "iPhone 13",
          service_type: "Screen Replacement",
          status: "pending",
        },
        error: null,
      }),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
  });

  it("updates repair booking details successfully", async () => {
    queryResult = { error: null };

    const result = await updateRepairBooking("booking-1", {
      status: "repairing",
      estimatedAmount: 850,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: "repairing",
      estimated_amount: 850,
    });
  });

  it("saves a new repair estimate price", async () => {
    queryResult = { error: null };

    const result = await saveRepairEstimate({
      deviceModel: "iPhone 15 Pro",
      serviceType: "Screen Replacement",
      price: 2400,
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      device_model: "iPhone 15 Pro",
      service_type: "Screen Replacement",
      price: 2400,
      is_active: true,
    });
  });

  it("deletes a repair estimate price", async () => {
    queryResult = { error: null };

    const result = await deleteRepairEstimate("estimate-1");

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});
