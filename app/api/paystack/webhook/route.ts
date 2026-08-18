/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendSMS, sendEmail } from "@/lib/notifications";

/**
 * POST /api/paystack/webhook
 *
 * Paystack calls this endpoint after a payment event.
 * We verify the signature, then mark the order as paid (which triggers
 * the stock decrement DB trigger) and update the payment channel.
 *
 * Configure in your Paystack dashboard:
 *   Webhook URL → https://your-domain.com/api/paystack/webhook
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    // If there's no secret key, we can't verify — reject.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  // HMAC-SHA512 verification (timing-safe)
  const expectedSig = createHmac("sha512", secret).update(raw).digest("hex");
  const sigBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSig, "utf-8");

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event: string;
    data?: {
      reference?: string;
      channel?: string;
      status?: string;
    };
  };

  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process successful charge events
  if (payload.event !== "charge.success" || payload.data?.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const ref = payload.data?.reference;
  const channel = payload.data?.channel ?? null;

  if (!ref) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Use service-role client — this runs outside user auth context
  const supabase = createServiceRoleClient();

  if (ref.startsWith("SCR-CARE-")) {
    const { data: sub } = await (supabase.from("care_subscriptions") as any)
      .select("id, user_id, tier_id, care_tiers(name, price)")
      .eq("paystack_ref", ref)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: subErr } = await (supabase.from("care_subscriptions") as any)
      .update({
        status: "active",
        starts_at: startsAt,
        ends_at: endsAt,
        price_paid: Number(sub.care_tiers?.price ?? 0),
      })
      .eq("paystack_ref", ref);

    if (subErr) {
      console.error("[paystack-webhook] Failed to activate care subscription:", subErr.message);
      return NextResponse.json({ error: "Care DB update failed" }, { status: 500 });
    }

    const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
    const userEmail = userData?.user?.email ?? "";
    const userPhone = userData?.user?.phone ?? "";

    const tierName = sub.care_tiers?.name ?? "ScrinHouse Care";
    const formattedPrice = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(sub.care_tiers?.price ?? 0));

    if (userPhone) {
      await sendSMS(
        userPhone,
        `Hi, your ScrinHouse Care subscription (${tierName}) is now ACTIVE! Details: ${process.env.NEXT_PUBLIC_APP_URL}/account?tab=care`
      );
    }
    if (userEmail) {
      await sendEmail(
        userEmail,
        `ScrinHouse Care Subscription Activated!`,
        `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #1d4ed8;">Subscription Active!</h2>
          <p>Your <strong>${tierName}</strong> protection is now active.</p>
          <p><strong>Paid:</strong> ${formattedPrice}</p>
          <p>View your plan status and claim logs at ScrinHouse: <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/account?tab=care">My Account Care</a></p>
        </div>`
      );
    }

    return NextResponse.json({ received: true });
  }

  // Fetch order details before update to know customer info
  const { data: order } = await (supabase
    .from("orders") as any)
    .select("id, delivery_address, total, user_id, order_items (product_name, quantity)")
    .eq("paystack_ref", ref)
    .maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({ status: "paid", paystack_channel: channel })
    .eq("paystack_ref", ref)
    .eq("status", "pending_payment"); // idempotency guard

  if (error) {
    console.error("[paystack-webhook] Failed to update order:", error.message);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  // Trigger payment notification alerts in background
  if (order) {
    const address = (order as any).delivery_address as any;
    const customerPhone = address?.phone;
    const customerName = address?.fullName ?? "Customer";
    const formattedTotal = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number((order as any).total));
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${(order as any).id}`;

    const items = ((order as any).order_items as any[]) ?? [];
    const productNames = items
      .map((item: any) => `${item.product_name} (x${item.quantity})`)
      .join(", ");

    // Send SMS alert to admin upon successful payment
    await sendSMS(
      "0559257401",
      `[ADMIN ALERT] Order #${(order as any).id.slice(0, 8).toUpperCase()} has been PAID by ${customerName} (${customerPhone || "No Phone"}). Total: ${formattedTotal}. Items: ${productNames}`
    );

    let userEmail = "";
    if ((order as any).user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById((order as any).user_id);
      userEmail = userData?.user?.email ?? "";
    }

    if (customerPhone) {
      await sendSMS(
        customerPhone,
        `Hi ${customerName}, your payment of ${formattedTotal} for order #${(order as any).id.slice(0, 8).toUpperCase()} was received successfully! We are now processing your shipment. Track here: ${trackingLink}`
      );
    }

    if (userEmail) {
      await sendEmail(
        userEmail,
        `Payment Confirmed - ScrinHouse`,
        `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #22c55e; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Payment Confirmed!</h2>
          <p>Hello ${customerName},</p>
          <p>We've received your payment of <strong>${formattedTotal}</strong> for order <strong>#${(order as any).id.slice(0, 8).toUpperCase()}</strong>.</p>
          <p>Your payment was processed via ${channel ?? "Paystack"}. We are packaging your items and will notify you as soon as they ship.</p>
          <p><a href="${trackingLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; margin-top: 10px;">Track Shipment Status</a></p>
          <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
        </div>`
      );
    }
  }

  return NextResponse.json({ received: true });
}
