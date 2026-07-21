import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRepairBooking, getEstimatePrice } from "@/actions/storefront/repairs";

// Mocks
const mockInsert = vi.fn();
const mockSelect = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Repair Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      select: vi.fn().mockImplementation(() => chain),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      single: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
  });

  it("gets estimate price from database", async () => {
    queryResult = { data: { price: 1250 }, error: null };

    const price = await getEstimatePrice("iPhone 13", "Screen Replacement");

    expect(price).toBe(1250);
  });

  it("returns null if estimate price is missing", async () => {
    queryResult = { data: null, error: null };

    const price = await getEstimatePrice("iPhone 13", "Screen Replacement");

    expect(price).toBeNull();
  });

  it("inserts repair booking successfully", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    queryResult = { data: { id: "booking-1" }, error: null };

    const result = await createRepairBooking({
      customerName: "Kofi Mensah",
      customerPhone: "0241234567",
      customerEmail: "kofi@example.com",
      deviceModel: "iPhone 13",
      serviceType: "Screen Replacement",
      issueDescription: "Cracked glass",
      estimatedAmount: 1250,
      deliveryMethod: "walk_in",
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe("booking-1");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      customer_name: "Kofi Mensah",
      device_model: "iPhone 13",
      estimated_amount: 1250,
    }));
  });
});
