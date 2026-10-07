"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getVapidPublicKey, sendAdminOrderPushNotification } from "@/lib/push-notifications";

export async function getVapidPublicKeyAction() {
  return { success: true, publicKey: getVapidPublicKey() };
}

export async function savePushSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceClient = createServiceRoleClient();

    const { error } = await (serviceClient.from("admin_push_subscriptions") as any).upsert(
      {
        user_id: user?.id ?? null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: subscription.userAgent || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("Failed to save push subscription:", error.message);
      if (error.message.includes("could not find table") || error.code === "42P01" || error.code === "PGRST205") {
        return {
          success: false,
          error: "Database table 'admin_push_subscriptions' is missing. Please run the SQL migration in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save push subscription";
    console.error("Exception in savePushSubscriptionAction:", err);
    return { success: false, error: msg };
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  try {
    const serviceClient = createServiceRoleClient();
    await (serviceClient.from("admin_push_subscriptions") as any)
      .delete()
      .eq("endpoint", endpoint);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove subscription";
    return { success: false, error: msg };
  }
}

export async function sendTestPushNotificationAction() {
  try {
    const res = await sendAdminOrderPushNotification({
      title: "🛒 New Order Received! (Test)",
      body: "Test Order #SH-8821 placed by Kwesi Appiah (GH₵ 4,500.00). Tap to view.",
      url: "/admin/orders",
    });

    if (!res.success) {
      return { success: false, error: res.error ?? "Failed to dispatch test push notification." };
    }

    if (res.sentCount === 0) {
      return { success: false, error: "No subscribed devices found. Tap 'Enable Push Notifications' first!" };
    }

    return { success: true, sentCount: res.sentCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send test push notification";
    return { success: false, error: msg };
  }
}
