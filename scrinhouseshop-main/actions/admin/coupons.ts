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

async function getAdminSupabaseClient() {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    if (typeof createServiceRoleClient === "function") {
      return createServiceRoleClient();
    }
  } catch {
    // Service role key not set or in test
  }
  return await createClient();
}

export async function listAdminCoupons(): Promise<CouponRow[]> {
  await requireStaffUser();
  const supabase = await getAdminSupabaseClient();

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
    minOrderAmount: Number(row.min_order_amount ?? 0),
    maxUses: row.max_uses,
    usedCount: Number(row.used_count ?? 0),
    isActive: Boolean(row.is_active),
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
  expiresAt?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await getAdminSupabaseClient();

  const cleanCode = data.code.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: "Please enter a valid coupon code." };
  }

  let finalExpiresAt: string | null = null;
  if (data.expiresAt && data.expiresAt.trim()) {
    const trimmedDate = data.expiresAt.trim();
    // If entered as YYYY-MM-DD date string, set expiry to 23:59:59.999 local/UTC of that date
    // so the code remains active throughout the whole day
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      const [year, month, day] = trimmedDate.split("-").map(Number);
      const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      finalExpiresAt = d.toISOString();
    } else {
      const parsed = new Date(trimmedDate);
      if (!isNaN(parsed.getTime())) {
        finalExpiresAt = parsed.toISOString();
      }
    }
  }

  const { error } = await (supabase.from("coupons") as any).insert({
    code: cleanCode,
    discount_type: data.discountType,
    discount_value: data.discountValue,
    min_order_amount: data.minOrderAmount ?? 0,
    max_uses: data.maxUses ?? null,
    used_count: 0,
    is_active: true,
    expires_at: finalExpiresAt,
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
  const supabase = await getAdminSupabaseClient();

  const { error } = await (supabase.from("coupons") as any)
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function deleteCoupon(id: string): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await getAdminSupabaseClient();

  const { error } = await (supabase.from("coupons") as any)
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/coupons");
  return { success: true };
}
