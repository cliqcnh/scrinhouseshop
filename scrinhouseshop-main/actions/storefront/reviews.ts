/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProductReviewItem {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export async function listProductReviews(productId: string): Promise<ProductReviewItem[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("reviews") as any)
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch product reviews:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userName: row.user_name ?? "Verified Customer",
    rating: Number(row.rating),
    title: row.title ?? "Customer Review",
    comment: row.comment ?? row.body ?? "",
    images: row.images ?? [],
    isVerifiedPurchase: Boolean(row.is_verified_purchase),
    createdAt: row.created_at,
  }));
}

export async function createProductReview(payload: {
  productId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const insertData: any = {
    product_id: payload.productId,
    rating: payload.rating,
    title: payload.title.trim(),
    comment: payload.comment.trim(),
    body: payload.comment.trim(),
    user_name: payload.userName.trim() || "Verified Customer",
    images: payload.images ?? [],
    status: "approved",
    is_verified_purchase: true,
  };

  if (user?.id) {
    insertData.user_id = user.id;
    insertData.profile_id = user.id;
  }

  const { error } = await (supabase.from("reviews") as any).insert(insertData);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/products/[slug]");
  return { success: true };
}
