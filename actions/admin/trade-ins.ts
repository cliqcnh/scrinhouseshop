/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface TradeInRequestRow {
  id: string;
  userId: string | null;
  applicantName: string;
  brand: string;
  model: string;
  storage: string;
  conditionGrade: string;
  screenCondition: string;
  batteryHealth: string;
  estimatedValue: number;
  contactPhone: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
}

export async function listAdminTradeIns(): Promise<TradeInRequestRow[]> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data, error } = await (supabase.from("trade_in_requests") as any)
    .select(`
      id,
      user_id,
      brand,
      model,
      storage,
      condition_grade,
      screen_condition,
      battery_health,
      estimated_value,
      contact_phone,
      notes,
      status,
      created_at,
      profiles (full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list trade-in requests:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    applicantName: row.profiles?.full_name ?? "Customer",
    brand: row.brand,
    model: row.model,
    storage: row.storage,
    conditionGrade: row.condition_grade,
    screenCondition: row.screen_condition,
    batteryHealth: row.battery_health,
    estimatedValue: Number(row.estimated_value),
    contactPhone: row.contact_phone,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function updateTradeInStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "completed",
  offeredQuote?: number
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (offeredQuote !== undefined && offeredQuote >= 0) {
    updateData.estimated_value = offeredQuote;
  }

  const { error } = await (supabase.from("trade_in_requests") as any)
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/trade-ins");
  return { success: true };
}
