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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in savePushSubscriptionAction:", err);
    return { success: false, error: err.message || "Failed to save push subscription" };
  }
}

export async function removePushSubscriptionAction(endpoint: string) {
  try {
    const serviceClient = createServiceRoleClient();
    await (serviceClient.from("admin_push_subscriptions") as any)
      .delete()
      .eq("endpoint", endpoint);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
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
      return { success: false, error: "Failed to dispatch test push notification." };
    }

    if (res.sentCount === 0) {
      return { success: false, error: "No subscribed devices found. Enable notifications first!" };
    }

    return { success: true, sentCount: res.sentCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
