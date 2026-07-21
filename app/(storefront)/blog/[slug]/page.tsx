/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ChevronLeft, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/format";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await (supabase.from("posts") as any)
    .select("title, excerpt")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!post) return {};

  return {
    title: (post as any).title,
    description: (post as any).excerpt ?? `Read ${(post as any).title} on ScrinHouse.`,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch post + join author details from profiles
  const { data: postData, error } = await (supabase.from("posts") as any)
    .select("*, author:profiles(full_name)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const post = postData as any;

  if (error || !post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground mb-8"
      >
        <ChevronLeft className="size-4" /> Back to Blog
      </Link>

      <header className="flex flex-col gap-4">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            <time dateTime={post.published_at}>
              {formatDate(post.published_at)}
            </time>
          </div>
          {post.author?.full_name && (
            <div className="flex items-center gap-1.5">
              <User className="size-4" />
              <span>By {post.author.full_name}</span>
            </div>
          )}
        </div>
      </header>

      {post.cover_image_url && (
        <div className="mt-8 aspect-video w-full overflow-hidden bg-muted/10 border border-border">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="size-full object-cover"
          />
        </div>
      )}

      {/* Main post body */}
      <div 
        className="mt-10 prose max-w-none text-foreground prose-headings:font-heading prose-headings:font-bold prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-[#1d4ed8] prose-a:hover:underline"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
