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
  const supabase = await createClient();
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await (supabase.from("coupons") as any)
    .select("*")
    .eq("code", cleanCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: "Invalid or expired promo code." };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "This promo code has expired." };
  }

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return { valid: false, error: "This promo code has reached its usage limit." };
  }

  const minOrder = Number(data.min_order_amount ?? 0);
  if (subtotal < minOrder) {
    return { valid: false, error: `Minimum order total of GHS ${minOrder.toFixed(2)} required for this code.` };
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
