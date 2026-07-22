"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

export interface RetryPaymentResult {
  success: boolean;
  authorizationUrl?: string | null;
  error?: string;
}

/**
 * Re-initializes Paystack payment for a pending order.
 */
export async function retryPendingOrderPayment(orderId: string): Promise<RetryPaymentResult> {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be signed in to perform this action." };
    }

    // 2. Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, total, delivery_address, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return { success: false, error: orderErr?.message ?? "Order not found." };
    }

    // Security check: order belongs to current user
    if (order.user_id !== user.id) {
      return { success: false, error: "Unauthorized access." };
    }

    if (order.status !== "pending_payment") {
      return { success: false, error: `Payment cannot be processed for an order with status "${order.status}".` };
    }

    const total = Number(order.total);
    const address = order.delivery_address as Record<string, any> ?? {};
    const customerName = address.fullName || "Customer";

    // Generate a fresh unique Paystack reference to avoid duplicate ref errors on Paystack
    const paystackRef = `SCR-RETRY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // 3. Initialize Paystack transaction
    const env = getServerEnv();
    let authorizationUrl: string | null = null;

    if (env.PAYSTACK_SECRET_KEY) {
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(total * 100), // pesewas
          currency: "GHS",
          reference: paystackRef,
          metadata: {
            orderId: order.id,
            customerName,
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/order/${order.id}?ref=${paystackRef}`,
        }),
      });

      if (!paystackRes.ok) {
        const errText = await paystackRes.text();
        return { success: false, error: `Paystack initialization failed: ${errText}` };
      }

      const json = (await paystackRes.json()) as { data?: { authorization_url?: string } };
      authorizationUrl = json.data?.authorization_url ?? null;
    }

    // 4. Update order with the new paystack reference
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ paystack_ref: paystackRef })
      .eq("id", orderId);

    if (updateErr) {
      return { success: false, error: `Failed to update order reference: ${updateErr.message}` };
    }

    return { success: true, authorizationUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}
