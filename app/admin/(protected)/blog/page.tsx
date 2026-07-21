import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calendar, Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAdminPosts, deleteBlogPost } from "@/actions/admin/blog";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = {
  title: "Blog Management - Admin",
};

export default async function AdminBlogPage() {
  const posts = await listAdminPosts();

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await deleteBlogPost(id);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Blog Posts
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Write, edit, and publish articles, comparisons, and repair advice.
          </p>
        </div>
        <Button
          size="default"
          className="rounded-none bg-[#1d4ed8] text-white hover:bg-[#1e40af] text-xs font-semibold uppercase tracking-wider gap-2"
          render={<Link href="/admin/blog/new" />}
        >
          <Plus className="size-4" /> New Article
        </Button>
      </div>

      {posts.length > 0 ? (
        <div className="overflow-hidden border border-border bg-white rounded-none">
          <table className="min-w-full divide-y divide-border text-left text-sm text-foreground">
            <thead className="bg-[#fcfcfc] text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-[#fcfcfc]">
                  <td className="px-6 py-4 font-semibold">
                    <div className="flex flex-col">
                      <span>{post.title}</span>
                      {post.excerpt && (
                        <span className="text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5">
                          {post.excerpt}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{post.slug}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        post.isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {post.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="rounded-none border border-border px-3 py-1.5 text-xs gap-1.5 hover:bg-[#f5f5f5]"
                        render={<Link href={`/admin/blog/${post.id}`} />}
                      >
                        <Edit className="size-3.5" /> Edit
                      </Button>
                      <form action={handleDelete} className="inline">
                        <input type="hidden" name="id" value={post.id} />
                        <Button
                          type="submit"
                          size="xs"
                          variant="ghost"
                          className="rounded-none border border-red-200 text-red-600 px-3 py-1.5 text-xs gap-1.5 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center border border-dashed border-border p-12 text-center">
          <BookOpen className="size-12 text-muted-foreground/40 mb-4" strokeWidth={1.2} />
          <h3 className="font-heading text-lg font-bold text-foreground">No articles created yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Get started by creating your first article to share tech updates and smartphone tips.
          </p>
          <Button
            size="default"
            className="rounded-none bg-[#1d4ed8] text-white hover:bg-[#1e40af] text-xs font-semibold uppercase tracking-wider gap-2 mt-6"
            render={<Link href="/admin/blog/new" />}
          >
            <Plus className="size-4" /> Create First Article
          </Button>
        </div>
      )}
    </div>
  );
}
