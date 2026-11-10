/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scrinhouseshop.vercel.app";

  // 1. Static Routes
  const staticRoutes = ["", "/about", "/contact", "/faq", "/blog", "/repairs"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const supabase = await createClient();

    // 2. Categories
    const { data: categories } = await supabase
      .from("categories")
      .select("slug")
      .eq("is_active", true);

    const categoryRoutes = (categories ?? []).map((cat) => ({
      url: `${baseUrl}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // 3. Products
    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);

    const productRoutes = (products ?? []).map((prod) => ({
      url: `${baseUrl}/products/${prod.slug}`,
      lastModified: new Date(prod.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // 4. Blog Posts
    const { data: posts } = await (supabase.from("posts") as any)
      .select("slug, updated_at")
      .eq("is_published", true);

    const postRoutes = (posts ?? []).map((post: any) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...postRoutes];
  } catch {
    return staticRoutes;
  }
}
