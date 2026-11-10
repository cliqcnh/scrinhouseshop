"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, AlertCircle, Send, Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getVapidPublicKeyAction,
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushNotificationAction,
} from "@/actions/admin/push-subscription";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setSupported(isPushSupported);

      if (isPushSupported) {
        setPermission(Notification.permission);
        checkCurrentSubscription();
      } else {
        setPermission("unsupported");
      }

      // Check if added to Home Screen / Standalone PWA
      const nav = window.navigator as unknown as { standalone?: boolean };
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone;
      setIsStandalonePWA(!!isStandalone);
    }
  }, []);

  async function checkCurrentSubscription() {
    try {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    } catch (err) {
      console.error("Error checking push subscription:", err);
    }
  }

  async function handleEnablePush() {
    if (!supported) {
      toast.error("Web Push is not supported on this browser or platform.");
      return;
    }

    setLoading(true);
    try {
      // 1. Request Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        toast.error("Notification permission denied. Please allow notifications in browser settings.");
        setLoading(false);
        return;
      }

      // 2. Register Service Worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID key
      const vapidRes = await getVapidPublicKeyAction();
      if (!vapidRes.success || !vapidRes.publicKey) {
        toast.error("Failed to retrieve push encryption key.");
        setLoading(false);
        return;
      }

      // 4. Subscribe with PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidRes.publicKey);
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 5. Save Subscription to Database
      const p256dh = sub.getKey("p256dh");
      const auth = sub.getKey("auth");

      if (!p256dh || !auth) {
        toast.error("Failed to extract subscription encryption keys.");
        setLoading(false);
        return;
      }

      const p256dhBase64 = btoa(String.fromCharCode(...new Uint8Array(p256dh)));
      const authBase64 = btoa(String.fromCharCode(...new Uint8Array(auth)));

      const saveRes = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        keys: {
          p256dh: p256dhBase64,
          auth: authBase64,
        },
        userAgent: navigator.userAgent,
      });

      if (!saveRes.success) {
        toast.error(saveRes.error ?? "Failed to save push subscription.");
        setLoading(false);
        return;
      }

      setIsSubscribed(true);
      toast.success("🔔 Order Push Notifications Enabled! You will be alerted when new orders arrive.");
    } catch (err: unknown) {
      console.error("Error enabling push notifications:", err);
      const msg = err instanceof Error ? err.message : "An error occurred enabling push notifications.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisablePush() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      toast.info("Push notifications disabled.");
    } catch (err) {
      console.error("Error disabling push notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTestPush() {
    setTesting(true);
    try {
      const res = await sendTestPushNotificationAction();
      if (!res.success) {
        toast.error(res.error ?? "Failed to send test push notification.");
      } else {
        toast.success(`Test Order Push Notification sent to ${res.sentCount} device(s)!`);
      }
    } catch {
      toast.error("An error occurred while sending test push notification.");
    } finally {
      setTesting(false);
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-600 dark:text-amber-400">
        <p className="font-semibold flex items-center gap-2">
          <AlertCircle className="size-4" /> Web Push Unsupported
        </p>
        <p className="mt-1 text-muted-foreground">
          Your current browser doesn&apos;t support Web Push. On iOS, add this website to your Home Screen (&quot;Add to Home Screen&quot;) to enable native Push Notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 to-slate-950 p-5 text-slate-100 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${isSubscribed ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}>
            {isSubscribed ? <Bell className="size-6 text-sky-400 animate-bounce" /> : <BellOff className="size-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-bold text-slate-50">
                Real-Time Order Push Notifications
              </h3>
              {isStandalonePWA && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <Smartphone className="size-3" /> Home Screen App
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Get instant native push alerts on your phone or desktop whenever a new customer order is placed or paid.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isSubscribed ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testing}
                onClick={handleSendTestPush}
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs rounded-xl gap-1.5"
              >
                <Send className="size-3.5 text-sky-400" />
                {testing ? "Sending..." : "Test Push"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={handleDisablePush}
                className="text-slate-400 hover:text-red-400 text-xs rounded-xl"
              >
                Disable
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={loading}
              onClick={handleEnablePush}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 gap-2 shadow-lg shadow-sky-500/20"
            >
              <Bell className="size-4" />
              {loading ? "Enabling..." : "Enable Push Notifications"}
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Status Banner */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="size-3.5 text-sky-400" />
          <span>VAPID Encrypted Push Protocol</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Permission:</span>
          <span className={`font-semibold capitalize ${permission === "granted" ? "text-emerald-400" : "text-amber-400"}`}>
            {permission}
          </span>
        </div>
      </div>
    </div>
  );
}
