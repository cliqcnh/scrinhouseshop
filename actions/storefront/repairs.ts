"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { sendSMS, sendEmail } from "@/lib/notifications";

export interface RepairEstimateItem {
  id: string;
  deviceModel: string;
  serviceType: string;
  price: number;
}

export interface RepairBookingValues {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deviceModel: string;
  serviceType: string;
  issueDescription: string;
  estimatedAmount: number;
  deliveryMethod: "pickup_delivery" | "walk_in";
  pickupAddress?: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    landmark?: string | null;
  } | null;
}

export async function listRepairEstimates(): Promise<RepairEstimateItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_estimates")
    .select("id, device_model, service_type, price")
    .eq("is_active", true)
    .order("device_model", { ascending: true })
    .order("service_type", { ascending: true });

  if (error) {
    console.error("Failed to load repair estimates:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    deviceModel: row.device_model,
    serviceType: row.service_type,
    price: Number(row.price),
  }));
}

export async function getEstimatePrice(deviceModel: string, serviceType: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_estimates")
    .select("price")
    .eq("device_model", deviceModel)
    .eq("service_type", serviceType)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return Number(data.price);
}

export async function createRepairBooking(values: RepairBookingValues): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const supabase = await createClient();
  
  // Try retrieving user id if logged in
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: user?.id ?? null,
    customer_name: values.customerName,
    customer_phone: values.customerPhone,
    customer_email: values.customerEmail,
    device_model: values.deviceModel,
    service_type: values.serviceType,
    issue_description: values.issueDescription,
    estimated_amount: values.estimatedAmount,
    delivery_method: values.deliveryMethod,
    pickup_address: values.pickupAddress ?? null,
  };

  const { data, error } = await supabase
    .from("repair_bookings")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Trigger repair booking notifications in background
  const formattedAmount = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(values.estimatedAmount);
  const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${data.id}`;

  sendSMS(
    values.customerPhone,
    `Hi ${values.customerName}, your ScrinHouse repair booking for ${values.deviceModel} (${values.serviceType}) is confirmed! Estimate: ${formattedAmount}. Track status: ${trackingLink}`
  );

  sendEmail(
    values.customerEmail,
    `Repair Booking Received - ScrinHouse`,
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Repair Booking Confirmed!</h2>
      <p>Hello ${values.customerName},</p>
      <p>Your repair service request has been successfully registered with ScrinHouse.</p>
      <p><strong>Booking ID:</strong> #${data.id.slice(0, 8).toUpperCase()}</p>
      <p><strong>Device Model:</strong> ${values.deviceModel}</p>
      <p><strong>Issue Category:</strong> ${values.serviceType}</p>
      <p><strong>Upfront Price Estimate:</strong> ${formattedAmount} (includes parts and labor)</p>
      <p><strong>Fulfillment Method:</strong> ${values.deliveryMethod === "pickup_delivery" ? "Doorstep Pickup & Return" : "Walk-in to Workshop"}</p>
      <p>You can track the live progress of your diagnostics and technician updates anytime: <a href="${trackingLink}">Track Repair Progress</a></p>
      <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
    </div>`
  );

  revalidatePath("/account");
  return { success: true, bookingId: data.id };
}
