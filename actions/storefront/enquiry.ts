"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const enquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(1, "Message is required"),
});

export async function submitProductEnquiry(
  productId: string,
  formData: { name: string; email: string; phone: string; message: string }
) {
  try {
    const validated = enquirySchema.parse(formData);

    const supabase = await createClient();

    // 1. Insert into product_enquiries
    const { data: enquiry, error: enquiryErr } = await supabase
      .from("product_enquiries")
      .insert({
        product_id: productId,
        customer_name: validated.name,
        customer_email: validated.email,
        customer_phone: validated.phone,
        status: "pending",
      })
      .select("id")
      .single();

    if (enquiryErr) {
      console.error("Enquiry insert failed:", enquiryErr.message);
      return { success: false, error: "Failed to submit enquiry. Please try again." };
    }

    // 2. Insert the initial message
    const { error: msgErr } = await supabase
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

    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const err = error.issues[0]?.message ?? "Invalid form details";
      return { success: false, error: err };
    }
    console.error("Product enquiry error:", error);
    return { success: false, error: error.message ?? "An unexpected error occurred." };
  }
}
