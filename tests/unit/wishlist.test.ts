import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleWishlist, getWishlistProductIds } from "@/actions/storefront/wishlist";

// Create mocks for Supabase client
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })),
};

// Mock the server client creation
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock Next.js cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Wishlist Actions", () => {
  let queryResult: any;
  let maybeSingleResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };
    maybeSingleResult = { error: null, data: null };
    
    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(maybeSingleResult)),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };
    
    mockSelect.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
  });

  it("returns an error if the user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await toggleWishlist("product-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("sign in");
  });

  it("adds a product to wishlist if it doesn't exist", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    maybeSingleResult = { data: null, error: null };
    queryResult = { error: null };

    const result = await toggleWishlist("product-1");

    expect(result.success).toBe(true);
    expect(result.isWishlisted).toBe(true);
  });

  it("removes a product from wishlist if it already exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    maybeSingleResult = { data: { id: "wish-1" }, error: null };
    queryResult = { error: null };

    const result = await toggleWishlist("product-1");

    expect(result.success).toBe(true);
    expect(result.isWishlisted).toBe(false);
  });
});
