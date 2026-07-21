"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AddressValues {
  id?: string;
  fullName: string;
  phone: string;
  region: string;
  city: string;
  landmark?: string | null;
  isDefault: boolean;
}

export async function saveAddress(values: AddressValues): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please sign in to save addresses." };
  }

  const payload = {
    user_id: user.id,
    full_name: values.fullName,
    phone: values.phone,
    region: values.region,
    city: values.city,
    landmark: values.landmark || null,
    is_default: values.isDefault,
  };

  // If this address is set to default, we must unset other default addresses first
  if (values.isDefault) {
    const { error: resetError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    if (resetError) {
      return { success: false, error: `Failed to reset defaults: ${resetError.message}` };
    }
  }

  const { error } = values.id
    ? await supabase.from("addresses").update(payload).eq("id", values.id).eq("user_id", user.id)
    : await supabase.from("addresses").insert(payload);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  return { success: true };
}

export async function deleteAddress(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  return { success: true };
}

export async function setDefaultAddress(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Unset all first
  const { error: resetError } = await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);

  if (resetError) {
    return { success: false, error: resetError.message };
  }

  // Set the specific one
  const { error: setError } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (setError) {
    return { success: false, error: setError.message };
  }

  revalidatePath("/account");
  revalidatePath("/checkout");
  return { success: true };
}

export async function getAddresses(): Promise<AddressValues[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("addresses")
    .select("id, full_name, phone, region, city, landmark, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []).map((addr) => ({
    id: addr.id,
    fullName: addr.full_name,
    phone: addr.phone,
    region: addr.region,
    city: addr.city,
    landmark: addr.landmark,
    isDefault: addr.is_default,
  }));
}
