"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { sendSMS, sendEmail } from "@/lib/notifications";

export interface RepairBookingRow {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deviceModel: string;
  serviceType: string;
  estimatedAmount: number;
  status: string;
  deliveryMethod: string;
  createdAt: string;
  technicianId?: string | null;
}

export interface RepairEstimateValues {
  id?: string;
  deviceModel: string;
  serviceType: string;
  price: number;
}

export async function listAdminRepairs(): Promise<RepairBookingRow[]> {
  await requireStaffUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_bookings")
    .select("id, customer_name, customer_phone, customer_email, device_model, service_type, estimated_amount, status, delivery_method, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list repair bookings: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    deviceModel: row.device_model,
    serviceType: row.service_type,
    estimatedAmount: Number(row.estimated_amount),
    status: row.status,
    deliveryMethod: row.delivery_method,
    createdAt: row.created_at,
  }));
}

export async function getAdminRepairById(id: string) {
  await requireStaffUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repair_bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch booking details: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    deviceModel: data.device_model,
    serviceType: data.service_type,
    issueDescription: data.issue_description,
    estimatedAmount: Number(data.estimated_amount),
    status: data.status,
    deliveryMethod: data.delivery_method,
    pickupAddress: data.pickup_address ? (data.pickup_address as any) : null,
    createdAt: data.created_at,
  };
}

export async function updateRepairBooking(
  id: string,
  payload: {
    status?: string;
    estimatedAmount?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("repair_bookings")
    .select("id, customer_name, customer_phone, customer_email, device_model, service_type, status")
    .eq("id", id)
    .maybeSingle();

  const updates: any = {};
  if (payload.status) updates.status = payload.status;
  if (payload.estimatedAmount !== undefined) updates.estimated_amount = payload.estimatedAmount;

  const { error } = await supabase
    .from("repair_bookings")
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  // Trigger notifications
  if (booking) {
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${booking.id}`;
    const readableStatus = (payload.status ?? booking.status).replace(/_/g, " ");
    const updatedAmt = payload.estimatedAmount !== undefined ? payload.estimatedAmount : null;
    const formattedAmount = updatedAmt !== null ? new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(updatedAmt) : "";

    let message = `Hi ${booking.customer_name}, your device repair booking status for ${booking.device_model} is now: ${readableStatus.toUpperCase()}.`;
    if (updatedAmt !== null) {
      message += ` Revised Quote: ${formattedAmount}.`;
    }
    message += ` Track here: ${trackingLink}`;

    sendSMS(booking.customer_phone, message);

    sendEmail(
      booking.customer_email,
      `Repair Booking Update - ScrinHouse`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Repair Tracking Update</h2>
        <p>Hello ${booking.customer_name},</p>
        <p>There is an update regarding your repair booking for <strong>${booking.device_model} (${booking.service_type})</strong>.</p>
        <p><strong>Booking ID:</strong> #${booking.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Current Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${readableStatus}</span></p>
        ${updatedAmt !== null ? `<p><strong>Revised Quote:</strong> ${formattedAmount}</p>` : ""}
        <p>You can track the live progress and diagnostics details anytime: <a href="${trackingLink}">Track Repair Live</a></p>
        <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
      </div>`
    );
  }

  revalidatePath(`/admin/repairs`);
  revalidatePath(`/admin/repairs/${id}`);
  revalidatePath(`/track`);
  return { success: true };
}

export async function saveRepairEstimate(values: RepairEstimateValues): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const payload = {
    device_model: values.deviceModel,
    service_type: values.serviceType,
    price: values.price,
    is_active: true,
  };

  const { error } = values.id
    ? await supabase.from("repair_estimates").update(payload).eq("id", values.id)
    : await supabase.from("repair_estimates").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/repairs`);
  revalidatePath(`/repairs/book`);
  return { success: true };
}

export async function deleteRepairEstimate(id: string): Promise<{ success: boolean; error?: string }> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("repair_estimates")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/repairs`);
  revalidatePath(`/repairs/book`);
  return { success: true };
}
