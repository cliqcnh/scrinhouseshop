import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Cryptographically valid matching VAPID keypair
const DEFAULT_VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BBeIprVAv9V6Y2Dk8QmDv3ddAfpB6GD-quywspkWTa1sbAAjnmeew7YjLYwLLmWYRj2mlYzRPBHpCaZxEpJpscI";
const DEFAULT_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "nuZxhB_LMhRTFf-MKl0yen8Pb0FbLaJwvR_OZQnvLBg";

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
}

function initWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@scrinhouse.com";

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface OrderPushPayload {
  title: string;
  body: string;
  url?: string;
  orderId?: string;
}

interface PushSubRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface WebPushError {
  statusCode?: number;
  message?: string;
}

/**
 * Sends a native Web Push Notification to all subscribed admin devices when a new order arrives.
 */
export async function sendAdminOrderPushNotification(payload: OrderPushPayload): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    initWebPush();
    const supabase = createServiceRoleClient();

    const { data: rawSubscriptions, error } = await supabase
      .from("admin_push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (error) {
      console.error("[PUSH DB ERROR]", error.message);
      return { success: false, sentCount: 0, error: error.message };
    }

    const subscriptions = (rawSubscriptions as unknown as PushSubRecord[]) ?? [];

    if (subscriptions.length === 0) {
      console.log("[PUSH] No admin device subscriptions registered yet.");
      return { success: true, sentCount: 0 };
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || `/admin/orders`,
      icon: "/icon.png",
      badge: "/icon.png",
      tag: payload.orderId ? `order-${payload.orderId}` : `order-${Date.now()}`,
    });

    let sentCount = 0;
    const expiredIds: string[] = [];
    let lastPushError = "";

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, pushPayload);
          sentCount++;
        } catch (err: unknown) {
          const pushErr = err as WebPushError;
          lastPushError = pushErr.message || "Failed push delivery";
          console.error(`[PUSH ERROR] Failed to send push to endpoint ${sub.endpoint}:`, pushErr.message);
          // If subscription is 404 or 410 (expired/unsubscribed), mark for removal
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            expiredIds.push(sub.id);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase
        .from("admin_push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    if (sentCount === 0 && subscriptions.length > 0) {
      return { success: false, sentCount: 0, error: lastPushError || "Push notification delivery failed for registered devices." };
    }

    console.log(`[PUSH SUCCESS] Web push notification delivered to ${sentCount}/${subscriptions.length} admin devices.`);
    return { success: true, sentCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to dispatch push notification";
    console.error("[PUSH EXCEPTION] Failed to dispatch admin order push notification:", err);
    return { success: false, sentCount: 0, error: msg };
  }
}
