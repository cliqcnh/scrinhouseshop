"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface AuditEvent {
  id: string;
  date: string;
  description: string;
  category: "order" | "repair" | "wallet" | "payout";
  flow: "in" | "out";
  amount: number;
  details?: string;
}

export interface FinancialSummary {
  totalSales: number;
  totalRepairs: number;
  totalWalletTransactions: number;
  totalPayouts: number;
  totalLockedInstallments: number;
  totalCollectedInstallments: number;
  totalCashSales: number;
  events: AuditEvent[];
}

export async function getFinancialAuditData(filters: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<FinancialSummary> {
  await requireStaffUser();
  const supabase = await createClient();

  // 1. Fetch Orders (inflow: paid, processing, shipped, delivered; outflow: refunded)
  let ordersQuery = supabase
    .from("orders")
    .select("id, created_at, total, status, delivery_address, wallet_amount_applied, is_installment, installment_deposit, installment_balance")
    .order("created_at", { ascending: false });

  if (filters.startDate) ordersQuery = ordersQuery.gte("created_at", filters.startDate);
  if (filters.endDate) ordersQuery = ordersQuery.lte("created_at", filters.endDate);

  const { data: orders, error: ordersErr } = await ordersQuery;
  if (ordersErr) throw new Error(`Orders fetch failed: ${ordersErr.message}`);

  // 2. Fetch Repairs (inflow: completed, delivered)
  let repairsQuery = supabase
    .from("repair_bookings")
    .select("id, created_at, estimated_amount, status, customer_name, device_model, service_type")
    .order("created_at", { ascending: false });

  if (filters.startDate) repairsQuery = repairsQuery.gte("created_at", filters.startDate);
  if (filters.endDate) repairsQuery = repairsQuery.lte("created_at", filters.endDate);

  const { data: repairs, error: repairsErr } = await repairsQuery;
  if (repairsErr) throw new Error(`Repairs fetch failed: ${repairsErr.message}`);

  // 3. Fetch Wallet Transactions
  let walletQuery = supabase
    .from("wallet_transactions")
    .select("id, created_at, amount, type, description, profiles:profiles(display_name)")
    .order("created_at", { ascending: false });

  if (filters.startDate) walletQuery = walletQuery.gte("created_at", filters.startDate);
  if (filters.endDate) walletQuery = walletQuery.lte("created_at", filters.endDate);

  const { data: walletTx, error: walletErr } = await (walletQuery as any);
  if (walletErr) throw new Error(`Wallet fetch failed: ${walletErr.message}`);

  // 4. Fetch Withdrawals (outflow: approved/paid)
  let withdrawalsQuery = supabase
    .from("withdrawal_requests")
    .select("id, created_at, amount, status, payment_method, profiles:profiles(display_name)")
    .order("created_at", { ascending: false });

  if (filters.startDate) withdrawalsQuery = withdrawalsQuery.gte("created_at", filters.startDate);
  if (filters.endDate) withdrawalsQuery = withdrawalsQuery.lte("created_at", filters.endDate);

  const { data: withdrawals, error: withdrawalsErr } = await (withdrawalsQuery as any);
  if (withdrawalsErr) throw new Error(`Withdrawals fetch failed: ${withdrawalsErr.message}`);

  // 5. Consolidate into AuditEvents
  const events: AuditEvent[] = [];

  // Map Orders
  for (const o of orders ?? []) {
    const address = o.delivery_address as any;
    const name = address?.fullName ?? "Customer";
    const statusStr = o.status.toUpperCase().replace(/_/g, " ");

    if (o.status === "refunded") {
      events.push({
        id: o.id,
        date: o.created_at,
        description: `Order Refunded #${o.id.slice(0, 8).toUpperCase()} - ${name}`,
        category: "order",
        flow: "out",
        amount: Number(o.total),
        details: `Status: ${statusStr}`,
      });
    } else if (["paid", "processing", "shipped", "delivered"].includes(o.status)) {
      events.push({
        id: o.id,
        date: o.created_at,
        description: `Order Payment #${o.id.slice(0, 8).toUpperCase()} - ${name}`,
        category: "order",
        flow: "in",
        amount: Number(o.total),
        details: `Wallet deduction: GH₵${o.wallet_amount_applied}, Status: ${statusStr}`,
      });
    }
  }

  // Map Repairs
  for (const r of repairs ?? []) {
    if (["completed", "delivered"].includes(r.status)) {
      events.push({
        id: r.id,
        date: r.created_at,
        description: `Repair Payment #${r.id.slice(0, 8).toUpperCase()} (${r.device_model}) - ${r.customer_name}`,
        category: "repair",
        flow: "in",
        amount: Number(r.estimated_amount),
        details: `Service: ${r.service_type}, Status: ${r.status.toUpperCase()}`,
      });
    }
  }

  // Map Wallet Transactions
  for (const w of walletTx ?? []) {
    const userName = (w.profiles as any)?.display_name ?? "User";
    const amt = Number(w.amount);
    events.push({
      id: w.id,
      date: w.created_at,
      description: `${w.description} (${userName})`,
      category: "wallet",
      flow: amt >= 0 ? "in" : "out",
      amount: Math.abs(amt),
      details: `Type: ${w.type.toUpperCase()}`,
    });
  }

  // Map Withdrawals
  for (const p of withdrawals ?? []) {
    if (["approved", "paid"].includes(p.status)) {
      const userName = (p.profiles as any)?.display_name ?? "User";
      events.push({
        id: p.id,
        date: p.created_at,
        description: `Payout Request #${p.id.slice(0, 8).toUpperCase()} - ${userName}`,
        category: "payout",
        flow: "out",
        amount: Number(p.amount),
        details: `Method: ${p.payment_method.toUpperCase()}, Status: ${p.status.toUpperCase()}`,
      });
    }
  }

  // Sort consolidated events by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filtered consolidated events based on category filter
  let filteredEvents = events;
  if (filters.category && filters.category !== "all") {
    filteredEvents = events.filter((e) => e.category === filters.category);
  }

  // Calculate Aggregated Metrics (always global or filtered by date depending on what's active)
  let totalSales = 0;
  let totalRepairs = 0;
  let totalWalletTransactions = 0;
  let totalPayouts = 0;

  for (const e of events) {
    if (e.category === "order" && e.flow === "in") totalSales += e.amount;
    if (e.category === "order" && e.flow === "out") totalSales -= e.amount;
    if (e.category === "repair" && e.flow === "in") totalRepairs += e.amount;
    if (e.category === "wallet") {
      totalWalletTransactions += e.flow === "in" ? e.amount : -e.amount;
    }
    if (e.category === "payout") totalPayouts += e.amount;
  }

  let totalLockedInstallments = 0;
  let totalCollectedInstallments = 0;
  let totalCashSales = 0;

  for (const o of orders ?? []) {
    if (["paid", "processing", "shipped", "delivered"].includes(o.status)) {
      if (o.is_installment) {
        totalCollectedInstallments += Number(o.installment_deposit || 0);
        totalLockedInstallments += Number(o.installment_balance || 0);
      } else {
        totalCashSales += Number(o.total || 0);
      }
    }
  }

  return {
    totalSales,
    totalRepairs,
    totalWalletTransactions,
    totalPayouts,
    totalLockedInstallments,
    totalCollectedInstallments,
    totalCashSales,
    events: filteredEvents,
  };
}
