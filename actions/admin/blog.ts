/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface BlogPostValues {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  isPublished: boolean;
}

export async function listAdminPosts(): Promise<BlogPostRow[]> {
  await requireStaffUser();
  const supabase = await createClient();
  const { data, error } = await (supabase.from("posts") as any)
    .select("id, title, slug, excerpt, is_published, published_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list blog posts:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }));
}

export async function getAdminPostById(id: string): Promise<BlogPostValues | null> {
  await requireStaffUser();
  const supabase = await createClient();
  const { data, error } = await (supabase.from("posts") as any)
    .select("id, title, slug, excerpt, content, cover_image_url, is_published")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: (data as any).id,
    title: (data as any).title,
    slug: (data as any).slug,
    excerpt: (data as any).excerpt,
    content: (data as any).content,
    coverImageUrl: (data as any).cover_image_url,
    isPublished: (data as any).is_published,
  };
}

export async function saveBlogPost(values: BlogPostValues): Promise<{ success: boolean; id?: string; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const payload: any = {
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt ?? null,
    content: values.content,
    cover_image_url: values.coverImageUrl ?? null,
    is_published: values.isPublished,
    published_at: values.isPublished ? new Date().toISOString() : null,
  };

  if (!values.id) {
    payload.author_id = user?.id ?? null;
  }

  const { data, error } = values.id
    ? await (supabase.from("posts") as any).update(payload).eq("id", values.id).select("id").single()
    : await (supabase.from("posts") as any).insert(payload).select("id").single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/blog`);
  if (values.id) {
    revalidatePath(`/admin/blog/${values.id}`);
  }
  revalidatePath(`/blog`);
  revalidatePath(`/blog/${values.slug}`);
  return { success: true, id: (data as any).id };
}

export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data: post } = await (supabase.from("posts") as any).select("slug").eq("id", id).maybeSingle();

  const { error } = await (supabase.from("posts") as any).delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/blog`);
  revalidatePath(`/blog`);
  if ((post as any)?.slug) {
    revalidatePath(`/blog/${(post as any).slug}`);
  }
  return { success: true };
}
