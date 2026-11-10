"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface EnquiryRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: "pending" | "replied" | "closed";
  createdAt: string;
}

export interface EnquiryMessage {
  id: string;
  enquiryId: string;
  sender: "customer" | "admin";
  message: string;
  createdAt: string;
}

export async function listEnquiries(): Promise<EnquiryRow[]> {
  await requireStaffUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_enquiries")
    .select(`
      id,
      product_id,
      customer_name,
      customer_email,
      customer_phone,
      status,
      created_at,
      products (
        id,
        name,
        slug,
        product_images ( url, is_primary )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch enquiries:", error.message);
    throw new Error("Failed to load enquiries.");
  }

  return (data ?? []).map((row: any) => {
    const images = row.products?.product_images ?? [];
    const primaryImg = images.find((i: any) => i.is_primary)?.url ?? images[0]?.url ?? null;

    return {
      id: row.id,
      productId: row.product_id,
      productName: row.products?.name ?? "Deleted Product",
      productSlug: row.products?.slug ?? "",
      productImageUrl: primaryImg,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

export async function getEnquiryMessages(enquiryId: string): Promise<EnquiryMessage[]> {
  await requireStaffUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_enquiry_messages")
    .select("id, enquiry_id, sender, message, created_at")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch enquiry messages:", error.message);
    throw new Error("Failed to load messages.");
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    enquiryId: row.enquiry_id,
    sender: row.sender,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function replyToEnquiry(enquiryId: string, message: string) {
  await requireStaffUser();

  if (!message || !message.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  const supabase = await createClient();

  // 1. Insert admin message
  const { error: msgErr } = await supabase
    .from("product_enquiry_messages")
    .insert({
      enquiry_id: enquiryId,
      sender: "admin",
      message: message.trim(),
    });

  if (msgErr) {
    console.error("Failed to insert admin reply:", msgErr.message);
    return { success: false, error: "Failed to send message." };
  }

  // 2. Set enquiry status to 'replied'
  const { error: statusErr } = await supabase
    .from("product_enquiries")
    .update({ status: "replied" })
    .eq("id", enquiryId);

  if (statusErr) {
    console.error("Failed to update enquiry status:", statusErr.message);
  }

  revalidatePath("/admin/enquiries");
  return { success: true };
}
