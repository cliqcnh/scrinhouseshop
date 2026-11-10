"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { revalidatePath } from "next/cache";

export interface AdminWithdrawalRequestRow {
  id: string;
  userId: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  amount: number;
  paymentMethod: "momo" | "bank";
  paymentDetails: any;
  status: "pending" | "approved" | "rejected" | "paid";
  notes: string | null;
  transactionRef: string | null;
  paidAmount: number | null;
  paidAt: string | null;
  createdAt: string;
}

/**
 * Lists all withdrawal requests for admin dashboard auditing.
 */
export async function listAdminWithdrawals(): Promise<AdminWithdrawalRequestRow[]> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data: requests, error } = await (supabase.from("withdrawal_requests") as any)
    .select("id, user_id, amount, payment_method, payment_details, status, notes, transaction_ref, paid_amount, paid_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list withdrawal requests: ${error.message}`);
  }

  const userIds = Array.from(new Set(((requests as any[]) ?? []).map((r) => r.user_id)));
  const profileMap = new Map<string, { fullName: string; phone: string; email: string }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    // Get emails from auth.users via admin client if possible, or fallback to email from profiles if exists
    // Since we don't have bulk email fetch, we can query users or fallback
    (profiles ?? []).forEach((p) => {
      profileMap.set(p.id, {
        fullName: p.full_name ?? "Customer",
        phone: p.phone ?? "—",
        email: "—", // Will load or placeholder
      });
    });
  }

  return (requests ?? []).map((row: any) => {
    const prof = profileMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      applicantName: prof?.fullName ?? "Customer",
      applicantPhone: prof?.phone ?? "—",
      applicantEmail: prof?.email ?? "—",
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      paymentDetails: row.payment_details,
      status: row.status,
      notes: row.notes,
      transactionRef: row.transaction_ref,
      paidAmount: row.paid_amount ? Number(row.paid_amount) : null,
      paidAt: row.paid_at,
      createdAt: row.created_at,
    };
  });
}

/**
 * Updates a withdrawal request status.
 * If status is transitioning to 'paid', the requested amount is deducted from the wallet.
 */
export async function updateWithdrawalStatus(
  id: string,
  status: "approved" | "rejected" | "paid",
  notes?: string,
  txRef?: string,
  paidAmount?: number
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  // 1. Fetch current request details
  const { data: requestResult } = await (supabase.from("withdrawal_requests") as any)
    .select("id, amount, status, user_id, payment_method")
    .eq("id", id)
    .single();

  const request = requestResult as any;

  if (!request) return { success: false, error: "Withdrawal request not found." };
  if (request.status === "paid") return { success: false, error: "Withdrawal request has already been paid." };
  if (request.status === "rejected") return { success: false, error: "Withdrawal request has already been rejected." };

  const finalPaidAmount = paidAmount !== undefined && paidAmount >= 0 ? paidAmount : Number(request.amount);

  // 2. Perform updates
  if (status === "paid") {
    // Check wallet balance
    const { data: walletData } = await (supabase.from("wallets") as any)
      .select("balance")
      .eq("id", request.user_id)
      .single();

    const wallet = walletData as any;
    const balance = wallet ? Number(wallet.balance) : 0;
    if (balance < request.amount) {
      return { success: false, error: `Customer has insufficient wallet balance (Current: GH₵ ${balance.toFixed(2)}).` };
    }

    // Deduct from wallet balance
    const { error: deductErr } = await (supabase.from("wallets") as any)
      .update({ balance: balance - request.amount, updated_at: new Date().toISOString() })
      .eq("id", request.user_id);

    if (deductErr) {
      return { success: false, error: `Failed to deduct wallet: ${deductErr.message}` };
    }

    // Insert wallet transaction record
    await (supabase.from("wallet_transactions") as any).insert({
      user_id: request.user_id,
      type: "withdrawal_debit",
      amount: -request.amount,
      description: `Withdrawal request paid (${request.payment_method.toUpperCase()})`,
      reference_id: id,
    });
  }

  // Update request details
  const updatePayload: any = {
    status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "paid") {
    updatePayload.paid_amount = finalPaidAmount;
    updatePayload.transaction_ref = txRef || null;
    updatePayload.paid_at = new Date().toISOString();
  }

  const { error: reqErr } = await (supabase.from("withdrawal_requests") as any)
    .update(updatePayload)
    .eq("id", id);

  if (reqErr) {
    return { success: false, error: `Failed to update request: ${reqErr.message}` };
  }

  revalidatePath("/admin/wallet");
  revalidatePath("/account");
  return { success: true };
}

/**
 * Gets the active system-wide referral reward setting.
 */
export async function getReferralRewardSetting(): Promise<number> {
  const supabase = await createClient();
  const { data } = await (supabase.from("admin_settings") as any)
    .select("value")
    .eq("key", "referral_reward_amount")
    .maybeSingle();

  return data ? Number((data as any).value) : 50.00;
}

/**
 * Configures the system-wide referral reward setting.
 */
export async function updateReferralRewardSetting(amount: number): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  if (amount < 0) return { success: false, error: "Reward amount cannot be negative." };

  const { error } = await (supabase.from("admin_settings") as any)
    .upsert({ key: "referral_reward_amount", value: amount.toFixed(2), updated_at: new Date().toISOString() });

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/wallet");
  return { success: true };
}
