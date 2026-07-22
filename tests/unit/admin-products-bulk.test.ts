import { describe, it, expect, vi, beforeEach } from "vitest";
import { bulkUpdateProducts } from "@/actions/admin/products";

// Mocks
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
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

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve()),
}));

describe("bulkUpdateProducts server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const chain: any = {
      in: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
    };

    mockUpdate.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
  });

  it("handles active bulk action", async () => {
    const res = await bulkUpdateProducts(["prod-1", "prod-2"], "active");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }));
  });

  it("handles inactive bulk action", async () => {
    const res = await bulkUpdateProducts(["prod-1", "prod-2"], "inactive");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });

  it("handles featured bulk action", async () => {
    const res = await bulkUpdateProducts(["prod-1", "prod-2"], "featured");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_featured: true }));
  });

  it("handles delete bulk action with cascading cleanup", async () => {
    const res = await bulkUpdateProducts(["prod-1", "prod-2"], "delete");
    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(3); // variants, images, products
  });
});
