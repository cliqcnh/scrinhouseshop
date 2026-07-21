"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { sendSMS, sendEmail } from "@/lib/notifications";

export interface AdminOrderRow {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
}

export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  await requireStaffUser();
  const supabase = await createClient();
  
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at, paystack_channel, user_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list orders: ${error.message}`);
  }

  // Fetch profiles separately to avoid PostgREST foreign key cache mismatch
  const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id).filter(Boolean)));
  const profileMap = new Map<string, { fullName: string; phone: string }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    (profiles ?? []).forEach((p) => {
      profileMap.set(p.id, {
        fullName: p.full_name ?? "Guest",
        phone: p.phone ?? "No Phone",
      });
    });
  }

  return (orders ?? []).map((row: any) => ({
    id: row.id,
    customerName: profileMap.get(row.user_id)?.fullName ?? "Guest",
    customerEmail: profileMap.get(row.user_id)?.phone ?? "—",
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    paymentMethod: row.paystack_channel ?? "paystack",
  }));
}

export async function getAdminOrderById(id: string) {
  const supabase = await createClient();

  const { data, error } = (await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      status,
      total,
      subtotal,
      delivery_address,
      paystack_channel,
      paystack_ref,
      created_at,
      order_items (
        id,
        product_id,
        product_name,
        variant_label,
        quantity,
        price
      )
    `)
    .eq("id", id)
    .maybeSingle()) as any;

  if (error) throw new Error(`Failed to fetch order details: ${error.message}`);
  if (!data) return null;

  // Fetch customer profile details separately to avoid PostgREST cache issues
  let customerProfile = null;
  if (data.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.user_id)
      .maybeSingle();

    if (profile) {
      customerProfile = {
        fullName: profile.full_name ?? "Guest",
        phone: profile.phone ?? "—",
      };
    }
  }

  // For each item, look up active warranties to see if serial was already registered
  const orderItemIds = (data.order_items ?? []).map((item: any) => item.id);
  
  let warrantyMap = new Map<string, string>(); // order_item_id -> imei_serial
  if (orderItemIds.length > 0) {
    const { data: warranties } = await supabase
      .from("warranties")
      .select("order_item_id, imei_serial")
      .in("order_item_id", orderItemIds);

    (warranties ?? []).forEach((w) => {
      if (w.order_item_id) {
        warrantyMap.set(w.order_item_id, w.imei_serial);
      }
    });
  }

  return {
    id: data.id,
    userId: data.user_id,
    userEmail: customerProfile?.phone ?? "—",
    status: data.status,
    total: Number(data.total),
    subtotal: Number(data.subtotal),
    deliveryAddress: data.delivery_address ? (data.delivery_address as any) : null,
    paymentMethod: data.paystack_channel ?? "paystack",
    paystackRef: data.paystack_ref,
    createdAt: data.created_at,
    customerProfile,
    items: (data.order_items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      quantity: item.quantity,
      price: Number(item.price),
      registeredSerial: warrantyMap.get(item.id) ?? null,
    })),
  };
}

export async function updateOrderStatus(orderId: string, status: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, delivery_address, total, user_id")
    .eq("id", orderId)
    .maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };

  // Trigger status updates alerts in background
  if (order) {
    const address = order.delivery_address as any;
    const customerPhone = address?.phone;
    const customerName = address?.fullName ?? "Customer";
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${order.id}`;
    const readableStatus = status.replace(/_/g, " ");

    if (customerPhone) {
      sendSMS(
        customerPhone,
        `Hi ${customerName}, your ScrinHouse order #${order.id.slice(0, 8).toUpperCase()} status is now: ${readableStatus.toUpperCase()}. Track: ${trackingLink}`
      );
    }

    if (order.user_id) {
      supabase.auth.admin.getUserById(order.user_id).then(({ data: userData }) => {
        const email = userData?.user?.email;
        if (email) {
          sendEmail(
            email,
            `Order Updated - ScrinHouse`,
            `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
              <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Order Status Update</h2>
              <p>Hello ${customerName},</p>
              <p>The status of your ScrinHouse order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been updated to: <span style="text-transform: uppercase; font-weight: bold;">${readableStatus}</span>.</p>
              <p>You can track the live progress of your shipment anytime: <a href="${trackingLink}">Track Shipment Status</a></p>
              <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
            </div>`
          );
        }
      });
    }
  }

  revalidatePath(`/admin/orders`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${orderId}`);
  revalidatePath(`/account`);
  revalidatePath(`/track`);
  return { success: true };
}

export async function assignProductWarranty(
  orderItemId: string,
  serialNumber: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const trimmedSerial = serialNumber.trim();
  if (!trimmedSerial) return { success: false, error: "Serial number / IMEI cannot be empty." };

  // 1. Fetch order item and its order details
  const { data: item, error: itemError } = (await supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      quantity,
      order:orders (
        user_id,
        delivery_address
      )
    `)
    .eq("id", orderItemId)
    .single()) as any;

  if (itemError || !item) {
    return { success: false, error: itemError?.message ?? "Order item not found." };
  }

  // 2. Fetch product details to determine warranty period (condition check)
  const { data: product, error: prodError } = await supabase
    .from("products")
    .select("condition")
    .eq("id", item.product_id)
    .single();

  if (prodError || !product) {
    return { success: false, error: "Linked product details not found." };
  }

  // Determine warranty duration: 12 months for brand new, 6 months for used, 3 months otherwise
  let durationMonths = 3;
  if (product.condition === "brand_new") {
    durationMonths = 12;
  } else if (product.condition === "uk_used") {
    durationMonths = 6;
  }

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setMonth(endsAt.getMonth() + durationMonths);

  const address = item.order?.delivery_address as any;
  const customerName = address?.fullName ?? "Customer";
  const customerPhone = address?.phone ?? "—";

  // Check if warranty already exists for this order item
  const { data: existing } = await supabase
    .from("warranties")
    .select("id")
    .eq("order_item_id", orderItemId)
    .maybeSingle();

  const payload = {
    order_item_id: orderItemId,
    product_id: item.product_id,
    user_id: item.order?.user_id ?? null,
    imei_serial: trimmedSerial,
    customer_name: customerName,
    customer_phone: customerPhone,
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };

  const { error: warrantyError } = existing
    ? await supabase.from("warranties").update(payload).eq("id", existing.id)
    : await supabase.from("warranties").insert(payload);

  if (warrantyError) {
    return { success: false, error: warrantyError.message };
  }

  // Trigger warranty activation notification
  const warrantyLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/warranty?q=${trimmedSerial}`;
  sendSMS(
    customerPhone,
    `Hi ${customerName}, your product warranty for IMEI/Serial ${trimmedSerial} has been registered and is now active! Check coverage details here: ${warrantyLink}`
  );

  // Fetch customer email from Auth in background
  if (item.order?.user_id) {
    supabase.auth.admin.getUserById(item.order.user_id).then(({ data: userData }) => {
      const email = userData?.user?.email;
      if (email) {
        sendEmail(
          email,
          `Warranty Activated - ScrinHouse`,
          `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #22c55e; font-size: 20px; font-weight: bold; margin-bottom: 10px;">Warranty Registered!</h2>
            <p>Hello ${customerName},</p>
            <p>Your product's warranty coverage has been registered successfully.</p>
            <p><strong>Device IMEI / Serial:</strong> ${trimmedSerial}</p>
            <p><strong>Starts At:</strong> ${startsAt.toLocaleDateString()}</p>
            <p><strong>Ends At:</strong> ${endsAt.toLocaleDateString()}</p>
            <p>Verify coverage and view remaining days: <a href="${warrantyLink}">Verify Warranty Coverage</a></p>
            <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
          </div>`
        );
      }
    });
  }

  revalidatePath(`/admin/orders`);
  revalidatePath(`/admin/orders/${orderItemId}`);
  revalidatePath(`/account`);
  revalidatePath(`/warranty`);
  return { success: true };
}
