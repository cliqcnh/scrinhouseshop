"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WalletTransactionRow {
  id: string;
  type: "referral_reward" | "refund" | "trade_in" | "purchase_payment" | "withdrawal_debit" | "withdrawal_refund" | "admin_adjustment";
  amount: number;
  description: string;
  createdAt: string;
}

export interface WithdrawalRequestRow {
  id: string;
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

export interface WalletDetails {
  balance: number;
  referralCode: string | null;
  transactions: WalletTransactionRow[];
  withdrawals: WithdrawalRequestRow[];
}

/**
 * Retrieves the current customer's wallet balance, transactions history,
 * and withdrawal request log list.
 */
export async function getWalletDetails(): Promise<WalletDetails> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be logged in to access your wallet.");

  // Get or create wallet
  let { data: walletData, error: walletErr } = await (supabase.from("wallets") as any)
    .select("balance")
    .eq("id", user.id)
    .maybeSingle();

  let wallet = walletData as any;

  if (walletErr) {
    console.error("Error loading wallet:", walletErr.message);
  }

  if (!wallet) {
    // Provision wallet on demand if missing
    const { data: newWalletData } = await (supabase.from("wallets") as any)
      .insert({ id: user.id, balance: 0.00 })
      .select("balance")
      .single();
    wallet = (newWalletData as any) || { balance: 0.00 };
  }

  // Get referral code
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();

  // Get transactions
  const { data: txs } = await (supabase.from("wallet_transactions") as any)
    .select("id, type, amount, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get withdrawals
  const { data: wdrs } = await (supabase.from("withdrawal_requests") as any)
    .select("id, amount, payment_method, payment_details, status, notes, transaction_ref, paid_amount, paid_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return {
    balance: Number(wallet.balance),
    referralCode: profile?.referral_code ?? null,
    transactions: (((txs as any[]) ?? []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      createdAt: t.created_at,
    }))),
    withdrawals: (((wdrs as any[]) ?? []).map((w: any) => ({
      id: w.id,
      amount: Number(w.amount),
      paymentMethod: w.payment_method,
      paymentDetails: w.payment_details,
      status: w.status,
      notes: w.notes,
      transactionRef: w.transaction_ref,
      paidAmount: w.paid_amount ? Number(w.paid_amount) : null,
      paidAt: w.paid_at,
      createdAt: w.created_at,
    }))),
  };
}

/**
 * Creates a new withdrawal request for the customer.
 */
export async function requestWithdrawal(
  amount: number,
  paymentMethod: "momo" | "bank",
  paymentDetails: any
): Promise<{ success: boolean; error?: string }> {
  if (amount <= 0) return { success: false, error: "Withdrawal amount must be greater than zero." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in to request withdrawals." };

  // Fetch balance and pending amount
  const { data: walletData } = await (supabase.from("wallets") as any)
    .select("balance")
    .eq("id", user.id)
    .single();

  const wallet = walletData as any;
  const balance = wallet ? Number(wallet.balance) : 0;

  const { data: pendingsData } = await (supabase.from("withdrawal_requests") as any)
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "pending");

  const pendings = pendingsData as any[];
  const pendingTotal = (pendings ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  if (balance - pendingTotal < amount) {
    return {
      success: false,
      error: `Insufficient available balance. You have GH₵ ${balance.toFixed(2)} in your wallet, with GH₵ ${pendingTotal.toFixed(2)} locked in pending requests.`
    };
  }

  // Insert withdrawal request
  const { error } = await (supabase.from("withdrawal_requests") as any)
    .insert({
      user_id: user.id,
      amount,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      status: "pending",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/account");
  return { success: true };
}

/**
 * Links the current logged-in customer to a referrer using their unique referral code.
 */
export async function bindReferralCode(code: string): Promise<{ success: boolean; error?: string }> {
  const sanitized = code.trim().toUpperCase();
  if (!sanitized) return { success: false, error: "Referral code cannot be empty." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in." };

  // 1. Fetch current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, referred_by, referral_code")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "Profile not found." };
  if (profile.referred_by) return { success: false, error: "You have already been referred." };
  if (profile.referral_code === sanitized) return { success: false, error: "You cannot refer yourself." };

  // 2. Fetch referrer's profile details
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", sanitized)
    .maybeSingle();

  if (!referrer) return { success: false, error: "Invalid referral code." };

  // 3. Link them
  const { error } = await supabase
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/account");
  return { success: true };
}
