"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveBlogPost } from "@/actions/admin/blog";
import type { BlogPostValues } from "@/actions/admin/blog";

interface BlogEditorProps {
  initialValues?: BlogPostValues | null;
}

export function BlogEditor({ initialValues }: BlogEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<BlogPostValues>({
    id: initialValues?.id,
    title: initialValues?.title ?? "",
    slug: initialValues?.slug ?? "",
    excerpt: initialValues?.excerpt ?? "",
    content: initialValues?.content ?? "",
    coverImageUrl: initialValues?.coverImageUrl ?? "",
    isPublished: initialValues?.isPublished ?? false,
  });

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setValues((prev) => {
      // Auto-generate slug only if slug hasn't been custom edited yet
      const shouldSlugify = !prev.id && (prev.slug === "" || prev.slug === slugify(prev.title));
      return {
        ...prev,
        title,
        slug: shouldSlugify ? slugify(title) : prev.slug,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title || !values.slug || !values.content) {
      toast.error("Please fill in all required fields (Title, Slug, Content)");
      return;
    }

    setLoading(true);
    try {
      const res = await saveBlogPost(values);
      if (res.success) {
        toast.success(values.id ? "Article updated successfully" : "Article created successfully");
        router.push("/admin/blog");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save article");
      }
    } catch (err: any) {
      toast.error(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="flex items-center justify-center size-9 border border-border text-muted-foreground hover:text-foreground hover:bg-[#f5f5f5]"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {values.id ? "Edit Article" : "New Article"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {values.id ? "Update post body and publication status." : "Draft a new article for the blog."}
            </p>
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="rounded-none bg-[#1d4ed8] text-white hover:bg-[#1e40af] text-xs font-semibold uppercase tracking-wider gap-2 px-6"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {values.id ? "Save Changes" : "Create Post"}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 border border-border p-6 bg-white rounded-none">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={values.title}
            onChange={handleTitleChange}
            placeholder="e.g. Top 5 iPhone Repair Tips"
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Slug / URL Path <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="slug"
            value={values.slug}
            onChange={(e) => setValues((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
            placeholder="e.g. top-5-iphone-repair-tips"
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none font-mono text-xs"
            required
          />
        </div>

        <div>
          <label htmlFor="coverImageUrl" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Cover Image URL
          </label>
          <input
            type="url"
            id="coverImageUrl"
            value={values.coverImageUrl ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
            placeholder="https://images.unsplash.com/photo-..."
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="excerpt" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Excerpt / Summary
          </label>
          <textarea
            id="excerpt"
            rows={2}
            value={values.excerpt ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, excerpt: e.target.value }))}
            placeholder="Provide a short summary of the article..."
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none resize-y"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="content" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Content Body (HTML/Text) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            rows={12}
            value={values.content}
            onChange={(e) => setValues((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="<p>Write your article here...</p>"
            className="w-full border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none rounded-none resize-y font-mono text-xs"
            required
          />
        </div>

        <div className="sm:col-span-2 border-t border-border pt-5 mt-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={values.isPublished}
              onChange={(e) => setValues((prev) => ({ ...prev, isPublished: e.target.checked }))}
              className="size-4 text-primary border-border focus:ring-0 focus:ring-offset-0 rounded-none cursor-pointer"
            />
            <div>
              <label htmlFor="isPublished" className="block text-sm font-semibold text-foreground cursor-pointer">
                Publish immediately
              </label>
              <p className="text-xs text-muted-foreground">
                If checked, the article will be visible immediately on the storefront blog list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
