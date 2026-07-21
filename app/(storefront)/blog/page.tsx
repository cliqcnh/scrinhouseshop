/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/format";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Blog",
  description: "Read updates, tutorials, and smartphone tips from Ghana's trusted phone repair workshop.",
};

export default async function BlogPage() {
  const supabase = await createClient();

  const { data: posts, error } = await (supabase.from("posts") as any)
    .select("id, title, slug, excerpt, cover_image_url, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to load blog posts:", error.message);
  }

  const items = posts ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          ScrinHouse Blog
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Tips, guides, and workshop updates from Ghana&apos;s trusted phone store & repair workshop.
        </p>
      </div>

      <div className="mt-12 border-t border-border pt-12">
        {items.length > 0 ? (
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post: any) => (
              <article key={post.id} className="flex flex-col items-start justify-between">
                <div className="relative w-full aspect-video overflow-hidden bg-muted/10 rounded-none border border-border">
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                      <BookOpen className="size-12" strokeWidth={1.2} />
                    </div>
                  )}
                </div>
                <div className="max-w-xl mt-4">
                  <div className="flex items-center gap-x-2 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <time dateTime={post.published_at ?? undefined}>
                      {formatDate(post.published_at)}
                    </time>
                  </div>
                  <div className="group relative">
                    <h3 className="mt-3 text-lg font-bold font-heading leading-6 text-foreground group-hover:underline">
                      <Link href={`/blog/${post.slug}`}>
                        <span className="absolute inset-0" />
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#1d4ed8] group-hover:underline">
                    Read Article <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No articles published yet"
            description="Check back soon for tutorials, tech guides, and shop news."
          />
        )}
      </div>
    </div>
  );
}
