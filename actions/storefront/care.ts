/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

export interface CareSubscriptionPayload {
  tierId: string;
  imeiSerial: string;
  deviceModel: string;
}

export async function subscribeToCarePlan(
  payload: CareSubscriptionPayload
): Promise<{ success: boolean; authorizationUrl?: string; error?: string }> {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to subscribe." };
  }

  // 2. Fetch tier details
  const { data: tier, error: tierErr } = await (supabase.from("care_tiers") as any)
    .select("*")
    .eq("id", payload.tierId)
    .maybeSingle();

  if (tierErr || !tier) {
    return { success: false, error: "Invalid subscription tier selected." };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const paystackRef = `SCR-CARE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // 3. Insert care subscription as pending_payment
  const { error: subErr } = await (supabase.from("care_subscriptions") as any)
    .insert({
      user_id: user.id,
      tier_id: tier.id,
      imei_serial: payload.imeiSerial.trim(),
      device_model: payload.deviceModel.trim(),
      status: "pending_payment",
      paystack_ref: paystackRef,
      price_paid: 0.00,
    });

  if (subErr) {
    return { success: false, error: subErr.message };
  }

  // 4. Initialize Paystack Transaction
  let authorizationUrl: string | undefined;
  const env = getServerEnv();

  if (env.PAYSTACK_SECRET_KEY) {
    try {
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(Number(tier.price) * 100),
          reference: paystackRef,
          callback_url: `${origin}/account?tab=care&ref=${paystackRef}`,
        }),
      });

      if (paystackRes.ok) {
        const json = (await paystackRes.json()) as { data?: { authorization_url?: string } };
        authorizationUrl = json.data?.authorization_url;
      } else {
        const errText = await paystackRes.text();
        console.error("Paystack Care Init failed:", errText);
      }
    } catch (e: any) {
      console.error("Paystack request error:", e.message);
    }
  }

  revalidatePath("/account");
  return {
    success: true,
    authorizationUrl,
  };
}
