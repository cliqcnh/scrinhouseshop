/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateTradeInValue, type TradeInInput } from "@/lib/trade-in";

export interface SubmitTradeInPayload extends TradeInInput {
  contactPhone: string;
  notes?: string;
  images?: string[];
}

export async function submitTradeInRequest(
  payload: SubmitTradeInPayload
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase.from("trade_in_requests") as any)
    .insert({
      user_id: user?.id ?? null,
      brand: payload.brand,
      model: payload.model,
      storage: payload.storage,
      condition_grade: payload.bodyCondition,
      screen_condition: payload.screenCondition,
      battery_health: payload.batteryHealth,
      estimated_value: 0, // Admin sets the official valuation quote
      contact_phone: payload.contactPhone,
      notes: payload.notes ?? null,
      images: payload.images ?? [],
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to submit trade-in request" };
  }

  revalidatePath("/admin/trade-ins");
  return { success: true, requestId: data.id };
}

export async function acceptTradeInValuation(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to accept a valuation." };
  }

  const { error } = await (supabase.from("trade_in_requests") as any)
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/trade-ins");
  revalidatePath("/account");
  return { success: true };
}
