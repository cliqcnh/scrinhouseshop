/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface InstallmentApplicationRow {
  id: string;
  orderId: string;
  userId: string | null;
  applicantName: string;
  applicantPhone: string;
  productName: string;
  productImage: string | null;
  basePrice: number;
  totalPrice: number;
  depositAmount: number;
  remainingBalance: number;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  status: "pending_review" | "approved" | "rejected" | "completed";
  notes: string | null;
  createdAt: string;
}

export async function listInstallmentApplications(): Promise<InstallmentApplicationRow[]> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data, error } = await (supabase.from("installment_applications") as any)
    .select(`
      id,
      order_id,
      user_id,
      base_price,
      total_price,
      deposit_amount,
      remaining_balance,
      ghana_card_number,
      ghana_card_front_url,
      ghana_card_back_url,
      status,
      notes,
      created_at,
      profiles (full_name, phone),
      products (name, primary_image_url)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list installment applications:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    applicantName: row.profiles?.full_name ?? "Customer",
    applicantPhone: row.profiles?.phone ?? "N/A",
    productName: row.products?.name ?? "Smartphone",
    productImage: row.products?.primary_image_url ?? null,
    basePrice: Number(row.base_price),
    totalPrice: Number(row.total_price),
    depositAmount: Number(row.deposit_amount),
    remainingBalance: Number(row.remaining_balance),
    ghanaCardNumber: row.ghana_card_number,
    ghanaCardFrontUrl: row.ghana_card_front_url,
    ghanaCardBackUrl: row.ghana_card_back_url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

import { DEFAULT_INSTALLMENT_CONFIG, type InstallmentConfig } from "@/lib/installments";

export async function getInstallmentConfig(): Promise<InstallmentConfig> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("store_settings") as any)
    .select("value")
    .eq("key", "installment_config")
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_INSTALLMENT_CONFIG;
  }

  const val = (data as any).value;
  return {
    profitPercentage: val.profit_percentage ?? 20,
    depositPercentage: val.deposit_percentage ?? 40,
    isEnabled: val.is_enabled ?? true,
  };
}

export async function saveInstallmentConfig(
  config: InstallmentConfig,
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const payload = {
    profit_percentage: config.profitPercentage,
    deposit_percentage: config.depositPercentage,
    is_enabled: config.isEnabled ?? true,
  };

  const { error } = await (supabase.from("store_settings") as any).upsert({
    key: "installment_config",
    value: payload,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/installments");
  revalidatePath("/");
  revalidatePath("/products/[slug]");
  return { success: true };
}

export async function updateInstallmentStatus(
  id: string,
  status: "pending_review" | "approved" | "rejected" | "completed",
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await (supabase.from("installment_applications") as any)
    .update({ status, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/installments");
  return { success: true };
}
