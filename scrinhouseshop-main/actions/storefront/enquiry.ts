"use server";

import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const enquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(1, "Message is required"),
});

export async function submitProductEnquiry(
  productId: string,
  formData: { name: string; email: string; phone: string; message: string },
  sessionToken?: string
) {
  try {
    const validated = enquirySchema.parse(formData);

    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    // Use service role to bypass RLS select limitations
    const adminSupabase = createServiceRoleClient();

    // 1. Insert into product_enquiries
    const { data: enquiry, error: enquiryErr } = await adminSupabase
      .from("product_enquiries")
      .insert({
        product_id: productId,
        customer_name: validated.name,
        customer_email: validated.email,
        customer_phone: validated.phone,
        status: "pending",
        user_id: user?.id ?? null,
        session_token: sessionToken ?? null,
      })
      .select("id")
      .single();

    if (enquiryErr) {
      console.error("Enquiry insert failed:", enquiryErr.message);
      return { success: false, error: "Failed to submit enquiry. Please try again." };
    }

    // 2. Insert the initial message
    const { error: msgErr } = await adminSupabase
      .from("product_enquiry_messages")
      .insert({
        enquiry_id: enquiry.id,
        sender: "customer",
        message: validated.message,
      });

    if (msgErr) {
      console.error("Enquiry message insert failed:", msgErr.message);
      return { success: false, error: "Failed to save message history." };
    }

    revalidatePath("/admin/enquiries");
    return { success: true, enquiryId: enquiry.id };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const err = error.issues[0]?.message ?? "Invalid form details";
      return { success: false, error: err };
    }
    console.error("Product enquiry error:", error);
    return { success: false, error: error.message ?? "An unexpected error occurred." };
  }
}

export async function listCustomerEnquiries(sessionToken: string) {
  try {
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    const adminSupabase = createServiceRoleClient();
    
    const SELECT_FIELDS = `
      id,
      product_id,
      customer_name,
      customer_email,
      customer_phone,
      status,
      created_at,
      user_id,
      session_token,
      products (
        id,
        name,
        slug,
        product_images ( url, is_primary )
      )
    `;

    let data: any[] = [];

    if (user?.id) {
      const { data: d1, error: err1 } = await adminSupabase
        .from("product_enquiries")
        .select(SELECT_FIELDS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (err1) {
        console.error("Failed to load customer enquiries (q1):", err1.message);
        return [];
      }

      if (sessionToken && typeof sessionToken === "string") {
        const { data: d2, error: err2 } = await adminSupabase
          .from("product_enquiries")
          .select(SELECT_FIELDS)
          .eq("session_token", sessionToken)
          .order("created_at", { ascending: false });

        if (err2) {
          console.error("Failed to load customer enquiries (q2):", err2.message);
          return [];
        }

        const merged = [...(d1 ?? []), ...(d2 ?? [])];
        const seen = new Set();
        data = merged.filter((item: any) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });

        // Ensure proper descending date sort after merge
        data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        data = d1 ?? [];
      }
    } else {
      if (sessionToken && typeof sessionToken === "string") {
        const { data: d, error: err } = await adminSupabase
          .from("product_enquiries")
          .select(SELECT_FIELDS)
          .eq("session_token", sessionToken)
          .order("created_at", { ascending: false });

        if (err) {
          console.error("Failed to load customer enquiries (q3):", err.message);
          return [];
        }
        data = d ?? [];
      }
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
        status: row.status as "pending" | "replied" | "closed",
        createdAt: row.created_at,
      };
    });
  } catch (error) {
    console.error("Error in listCustomerEnquiries:", error);
    return [];
  }
}

export async function getCustomerEnquiryMessages(enquiryId: string, sessionToken: string) {
  try {
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    const adminSupabase = createServiceRoleClient();

    // 1. Verify ownership of the enquiry
    const { data: enquiry, error: enquiryErr } = await adminSupabase
      .from("product_enquiries")
      .select("user_id, session_token")
      .eq("id", enquiryId)
      .single();

    if (enquiryErr || !enquiry) {
      throw new Error("Enquiry not found.");
    }

    const isOwner =
      (user?.id && enquiry.user_id === user.id) ||
      (enquiry.session_token === sessionToken);

    if (!isOwner) {
      throw new Error("Access denied.");
    }

    // 2. Fetch messages
    const { data: messages, error: messagesErr } = await adminSupabase
      .from("product_enquiry_messages")
      .select("id, enquiry_id, sender, message, created_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: true });

    if (messagesErr) {
      console.error("Failed to load customer enquiry messages:", messagesErr.message);
      return [];
    }

    return (messages ?? []).map((row: any) => ({
      id: row.id,
      enquiryId: row.enquiry_id,
      sender: row.sender as "customer" | "admin",
      message: row.message,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error in getCustomerEnquiryMessages:", error);
    return [];
  }
}

export async function sendCustomerMessage(enquiryId: string, message: string, sessionToken: string) {
  try {
    if (!message || !message.trim()) {
      return { success: false, error: "Message cannot be empty." };
    }

    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    const adminSupabase = createServiceRoleClient();

    // 1. Verify ownership
    const { data: enquiry, error: enquiryErr } = await adminSupabase
      .from("product_enquiries")
      .select("user_id, session_token")
      .eq("id", enquiryId)
      .single();

    if (enquiryErr || !enquiry) {
      return { success: false, error: "Enquiry not found." };
    }

    const isOwner =
      (user?.id && enquiry.user_id === user.id) ||
      (enquiry.session_token === sessionToken);

    if (!isOwner) {
      return { success: false, error: "Access denied." };
    }

    // 2. Insert message
    const { error: msgErr } = await adminSupabase
      .from("product_enquiry_messages")
      .insert({
        enquiry_id: enquiryId,
        sender: "customer",
        message: message.trim(),
      });

    if (msgErr) {
      console.error("Failed to insert customer message:", msgErr.message);
      return { success: false, error: "Failed to send message." };
    }

    // 3. Mark enquiry status as 'pending' (ready for admin attention)
    await adminSupabase
      .from("product_enquiries")
      .update({ status: "pending" })
      .eq("id", enquiryId);

    revalidatePath("/admin/enquiries");
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendCustomerMessage:", error);
    return { success: false, error: error.message ?? "An unexpected error occurred." };
  }
}
