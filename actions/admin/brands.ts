"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { brandFormSchema, type BrandFormValues } from "@/lib/validations/admin-taxonomy";
import type { ActionResult } from "@/actions/admin/products";

export async function saveBrand(values: BrandFormValues): Promise<ActionResult> {
  await requireStaffUser();
  const parsed = brandFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const payload = { name: data.name, slug: data.slug, is_active: data.isActive };

  const { error } = data.id
    ? await supabase.from("brands").update(payload).eq("id", data.id)
    : await supabase.from("brands").insert(payload);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/brands");
  return { success: true };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  await requireStaffUser();
  const supabase = await createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/brands");
  return { success: true };
}
