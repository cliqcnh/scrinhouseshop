/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface AdminSubscriptionRow {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  imeiSerial: string;
  deviceModel: string;
  status: "pending_payment" | "active" | "cancelled" | "expired";
  pricePaid: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  tierName: string;
  tierSlug: string;
  tierPrice: number;
  screenLimit: number;
  screenCopay: number;
  batteryDiscount: number;
  chargingFreeCount: number;
  backGlassDiscount: number;
  claimsCount: number;
}

export async function listAdminSubscriptions(): Promise<AdminSubscriptionRow[]> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data, error } = await (supabase.from("care_subscriptions") as any)
    .select(`
      id,
      user_id,
      imei_serial,
      device_model,
      status,
      price_paid,
      starts_at,
      ends_at,
      created_at,
      profiles (full_name),
      care_tiers (
        name,
        slug,
        price,
        screen_limit,
        screen_copay_percentage,
        battery_discount,
        charging_port_free_count,
        back_glass_discount
      ),
      care_claims ( id )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list care subscriptions:", error.message);
    return [];
  }

  // Get user emails by doing an admin call or fallback
  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    customerName: row.profiles?.full_name ?? "Customer",
    customerEmail: "", // Managed on view or loaded
    imeiSerial: row.imei_serial,
    deviceModel: row.device_model,
    status: row.status,
    pricePaid: Number(row.price_paid),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    tierName: row.care_tiers?.name ?? "Unknown Tier",
    tierSlug: row.care_tiers?.slug ?? "",
    tierPrice: Number(row.care_tiers?.price ?? 0),
    screenLimit: row.care_tiers?.screen_limit ?? 1,
    screenCopay: Number(row.care_tiers?.screen_copay_percentage ?? 50),
    batteryDiscount: Number(row.care_tiers?.battery_discount ?? 15),
    chargingFreeCount: row.care_tiers?.charging_port_free_count ?? 0,
    backGlassDiscount: Number(row.care_tiers?.back_glass_discount ?? 15),
    claimsCount: (row.care_claims ?? []).length,
  }));
}

export interface RegisterClaimPayload {
  subscriptionId: string;
  claimType: "screen" | "battery" | "charging_port" | "back_glass" | "other";
  partCost: number;
  notes?: string;
}

export async function registerCareClaim(
  payload: RegisterClaimPayload
): Promise<{ success: boolean; error?: string; coPayPaid?: number; excessPaid?: number }> {
  await requireStaffUser();
  const supabase = await createClient();

  // 1. Fetch Subscription details
  const { data: sub, error: subErr } = await (supabase.from("care_subscriptions") as any)
    .select(`
      id,
      status,
      starts_at,
      ends_at,
      care_tiers (
        slug,
        screen_limit,
        screen_copay_percentage,
        battery_discount,
        charging_port_free_count,
        back_glass_discount
      )
    `)
    .eq("id", payload.subscriptionId)
    .maybeSingle();

  if (subErr || !sub) {
    return { success: false, error: "Subscription not found." };
  }

  if (sub.status !== "active") {
    return { success: false, error: `Claims can only be filed on ACTIVE subscriptions (Current: ${sub.status}).` };
  }

  // 2. Validate 2-month waiting period (60 days)
  const startsAt = new Date(sub.starts_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startsAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 60) {
    return {
      success: false,
      error: `Claims cannot be made during the first 2 months of subscription. Activation was ${diffDays} days ago (Requires 60 days).`,
    };
  }

  // 3. Fetch past claims count for limit validation
  const { data: pastClaims, error: claimsErr } = await (supabase.from("care_claims") as any)
    .select("claim_type")
    .eq("subscription_id", sub.id);

  if (claimsErr) {
    return { success: false, error: "Failed to verify subscription claim limits." };
  }

  const previousClaims = pastClaims ?? [];

  // Limit check for screen claims
  if (payload.claimType === "screen") {
    const screenClaims = previousClaims.filter((c: any) => c.claim_type === "screen").length;
    const limit = sub.care_tiers?.screen_limit ?? 1;
    if (screenClaims >= limit) {
      return { success: false, error: `Screen claim limit reached for this subscription year (Limit: ${limit}).` };
    }
  }

  // 4. Calculate Covered, Copay, and Excess values
  // Ceiling limit: GH₵ 1,000
  const ceiling = 1000.00;
  const partCost = Number(payload.partCost);
  const excessPaid = Math.max(0, partCost - ceiling);
  const covered = Math.min(partCost, ceiling);

  // Retrieve coverage percentage of selected repair type
  let coveragePercentage = 0; // The portion covered by ScrinHouse Care
  if (payload.claimType === "screen") {
    coveragePercentage = 100 - Number(sub.care_tiers?.screen_copay_percentage ?? 50);
  } else if (payload.claimType === "battery") {
    coveragePercentage = Number(sub.care_tiers?.battery_discount ?? 15);
  } else if (payload.claimType === "back_glass") {
    coveragePercentage = Number(sub.care_tiers?.back_glass_discount ?? 15);
  } else if (payload.claimType === "charging_port") {
    const portClaims = previousClaims.filter((c: any) => c.claim_type === "charging_port").length;
    const freeCount = sub.care_tiers?.charging_port_free_count ?? 0;
    if (portClaims < freeCount) {
      coveragePercentage = 100; // Free port service
    } else {
      coveragePercentage = 15; // Standard port discount
    }
  }

  const scrinhouseCovered = Math.round(covered * (coveragePercentage / 100) * 100) / 100;
  const coPayPaid = Math.round((covered - scrinhouseCovered) * 100) / 100;

  // 5. Insert claim records
  const { error: insertErr } = await (supabase.from("care_claims") as any)
    .insert({
      subscription_id: sub.id,
      claim_type: payload.claimType,
      part_cost: partCost,
      excess_paid: excessPaid,
      co_pay_paid: coPayPaid,
      notes: payload.notes ?? null,
    });

  if (insertErr) {
    return { success: false, error: insertErr.message };
  }

  revalidatePath("/admin/care");
  revalidatePath("/account");
  return {
    success: true,
    coPayPaid,
    excessPaid,
  };
}

export async function updateCareTierSettings(
  tierId: string,
  name: string,
  price: number
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await (supabase.from("care_tiers") as any)
    .update({ name: name.trim(), price: Number(price) })
    .eq("id", tierId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/care");
  revalidatePath("/care");
  return { success: true };
}
