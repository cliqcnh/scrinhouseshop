/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface CouponRow {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export async function listAdminCoupons(): Promise<CouponRow[]> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data, error } = await (supabase.from("coupons") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list coupons:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrderAmount: Number(row.min_order_amount),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function createCoupon(data: {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await (supabase.from("coupons") as any).insert({
    code: data.code.trim().toUpperCase(),
    discount_type: data.discountType,
    discount_value: data.discountValue,
    min_order_amount: data.minOrderAmount ?? 0,
    max_uses: data.maxUses ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function toggleCouponActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await (supabase.from("coupons") as any)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}
