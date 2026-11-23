/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";

export interface ValidateCouponResult {
  valid: boolean;
  couponCode?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  error?: string;
}

export async function validateCoupon(code: string, subtotal: number): Promise<ValidateCouponResult> {
  const cleanCode = code ? code.trim().toUpperCase() : "";
  if (!cleanCode) {
    return { valid: false, error: "Please enter a promo code." };
  }

  // Try privileged service role client first to avoid any client RLS issues,
  // falling back to standard createClient
  let supabase: any;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    if (typeof createServiceRoleClient === "function") {
      supabase = createServiceRoleClient();
    }
  } catch {
    // Service role not configured or in unit test environment
  }

  if (!supabase) {
    supabase = await createClient();
  }

  const { data, error } = await (supabase.from("coupons") as any)
    .select("*")
    .eq("code", cleanCode)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: `Promo code "${cleanCode}" does not exist. Please check your spelling.` };
  }

  if (!data.is_active) {
    return { valid: false, error: `Promo code "${cleanCode}" is currently disabled.` };
  }

  // Check expiration if set
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    if (!isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      return { valid: false, error: "This promo code has expired." };
    }
  }

  // Check usage limit if set
  if (data.max_uses !== null && data.max_uses !== undefined && data.used_count >= Number(data.max_uses)) {
    return { valid: false, error: "This promo code has reached its maximum usage limit." };
  }

  const minOrder = Number(data.min_order_amount ?? 0);
  if (subtotal < minOrder) {
    return {
      valid: false,
      error: `Minimum order total of GHS ${minOrder.toFixed(2)} required for this promo code.`,
    };
  }

  let discountAmount = 0;
  if (data.discount_type === "percentage") {
    discountAmount = Math.round((subtotal * (Number(data.discount_value) / 100)) * 100) / 100;
  } else {
    discountAmount = Math.min(subtotal, Number(data.discount_value));
  }

  return {
    valid: true,
    couponCode: data.code,
    discountType: data.discount_type,
    discountValue: Number(data.discount_value),
    discountAmount,
  };
}
