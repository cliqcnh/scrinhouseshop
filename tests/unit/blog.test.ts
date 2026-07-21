import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAdminPosts, getAdminPostById, saveBlogPost, deleteBlogPost } from "@/actions/admin/blog";

// Mocks
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } }, error: null })),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
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

describe("Blog Server Actions", () => {
  let queryResult: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { error: null, data: null };

    const chain: any = {
      eq: vi.fn().mockImplementation(() => chain),
      order: vi.fn().mockImplementation(() => chain),
      select: vi.fn().mockImplementation(() => chain),
      single: mockSingle,
      maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(queryResult)),
      then: vi.fn().mockImplementation((resolve) => resolve(queryResult)),
    };

    mockSelect.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
  });

  it("lists admin posts successfully", async () => {
    queryResult = {
      data: [
        {
          id: "post-1",
          title: "My First Post",
          slug: "my-first-post",
          excerpt: "Excerpt here",
          is_published: true,
          published_at: "2026-07-19T00:00:00Z",
          created_at: "2026-07-19T00:00:00Z",
        },
      ],
      error: null,
    };

    const result = await listAdminPosts();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My First Post");
  });

  it("fetches a single post by id", async () => {
    queryResult = {
      data: {
        id: "post-1",
        title: "Test Post",
        slug: "test-post",
        excerpt: "Excerpt",
        content: "<p>Hello</p>",
        cover_image_url: null,
        is_published: true,
      },
      error: null,
    };

    const result = await getAdminPostById("post-1");
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Post");
  });

  it("inserts a new blog post successfully", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "post-new" },
      error: null,
    });

    const result = await saveBlogPost({
      title: "New Post Title",
      slug: "new-post-title",
      content: "<p>New Content</p>",
      isPublished: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("post-new");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      title: "New Post Title",
      slug: "new-post-title",
      is_published: true,
    }));
  });

  it("updates an existing blog post successfully", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "post-1" },
      error: null,
    });

    const result = await saveBlogPost({
      id: "post-1",
      title: "Updated Title",
      slug: "updated-title",
      content: "<p>Updated Content</p>",
      isPublished: false,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Updated Title",
      is_published: false,
    }));
  });

  it("deletes a blog post successfully", async () => {
    queryResult = { error: null };

    const result = await deleteBlogPost("post-1");
    expect(result.success).toBe(true);
  });
});
