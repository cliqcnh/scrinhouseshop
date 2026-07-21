import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveAddress, deleteAddress } from "@/actions/storefront/addresses";

// Mocks
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Address Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };
    
    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };
    
    mockSelect.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
  });

  const sampleAddress = {
    fullName: "Kofi Mensah",
    phone: "0241234567",
    region: "Greater Accra",
    city: "East Legon",
    landmark: "Near Mall",
    isDefault: false,
  };

  it("fails to save address if user is unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await saveAddress(sampleAddress);

    expect(result.success).toBe(false);
    expect(result.error).toContain("sign in");
  });

  it("inserts new address if no id is provided", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    queryResult = { error: null };

    const result = await saveAddress(sampleAddress);

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      full_name: "Kofi Mensah",
      phone: "0241234567",
      region: "Greater Accra",
      city: "East Legon",
    }));
  });

  it("updates existing address if id is provided", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    queryResult = { error: null };

    const result = await saveAddress({ ...sampleAddress, id: "addr-1" });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      full_name: "Kofi Mensah",
    }));
  });
});
