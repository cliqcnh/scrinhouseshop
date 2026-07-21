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

  // Fetch order details before update to know customer info
  const { data: order } = await supabase
    .from("orders")
    .select("id, delivery_address, total, user_id")
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
    const address = order.delivery_address as any;
    const customerPhone = address?.phone;
    const customerName = address?.fullName ?? "Customer";
    const formattedTotal = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(order.total));
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${order.id}`;

    let userEmail = "";
    if (order.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
      userEmail = userData?.user?.email ?? "";
    }

    if (customerPhone) {
      sendSMS(
        customerPhone,
        `Hi ${customerName}, your payment of ${formattedTotal} for order #${order.id.slice(0, 8).toUpperCase()} was received successfully! We are now processing your shipment. Track here: ${trackingLink}`
      );
    }

    if (userEmail) {
      sendEmail(
        userEmail,
        `Payment Confirmed - ScrinHouse`,
        `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #22c55e; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Payment Confirmed!</h2>
          <p>Hello ${customerName},</p>
          <p>We've received your payment of <strong>${formattedTotal}</strong> for order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong>.</p>
          <p>Your payment was processed via ${channel ?? "Paystack"}. We are packaging your items and will notify you as soon as they ship.</p>
          <p><a href="${trackingLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; margin-top: 10px;">Track Shipment Status</a></p>
          <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
        </div>`
      );
    }
  }

  return NextResponse.json({ received: true });
}
