import { describe, it, expect, vi, beforeEach } from "vitest";
import { importBulkProducts } from "@/actions/admin/bulk-products";

// Mocks
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

const mockStorageUpload = vi.fn(() => Promise.resolve({ error: null }));
const mockStorageGetPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://storage/public/img.jpg" } }));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })),
  storage: {
    from: vi.fn(() => ({
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl,
    })),
  },
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

describe("importBulkProducts server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles valid bulk imports, resolving categories and mapping images successfully", async () => {
    // Categories lookup
    mockSelect.mockImplementationOnce(() => Promise.resolve({
      data: [{ id: "cat-1", name: "Phones", slug: "phones" }],
      error: null,
    }));
    // Brands lookup
    mockSelect.mockImplementationOnce(() => Promise.resolve({
      data: [{ id: "brand-1", name: "Apple", slug: "apple" }],
      error: null,
    }));

    // Product insert mock response
    mockInsert.mockImplementationOnce(() => {
      const chain: any = {
        select: () => ({
          single: () => Promise.resolve({ data: { id: "product-123" }, error: null }),
        }),
      };
      return chain;
    });

    // Variants insert mock response
    mockInsert.mockImplementationOnce(() => Promise.resolve({ error: null }));

    // Image record insert mock response
    mockInsert.mockImplementationOnce(() => Promise.resolve({ error: null }));

    const products = [
      {
        name: "iPhone 15",
        slug: "iphone-15",
        description: "Test description",
        categoryName: "Phones",
        brandName: "Apple",
        productType: "phone" as const,
        sku: "IPH15-BASE",
        basePrice: 1500,
        variantsString: "128GB/Black/IPH15-128-BLK/1500/10",
        imageNames: "iphone15_front.jpg",
      },
    ];

    const images = [
      {
        name: "iphone15_front.jpg",
        base64: "dGVzdC1pbWFnZS1kYXRh", // "test-image-data"
        type: "image/jpeg",
      },
    ];

    const result = await importBulkProducts(products, images);

    expect(result.importedCount).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.success).toBe(true);
    expect(mockStorageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^product-123\//),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/jpeg" })
    );
  });
});
