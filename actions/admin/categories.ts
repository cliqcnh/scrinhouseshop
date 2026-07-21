"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validations/admin-taxonomy";
import type { ActionResult } from "@/actions/admin/products";

export async function saveCategory(values: CategoryFormValues): Promise<ActionResult> {
  await requireStaffUser();
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const payload = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    parent_id: data.parentId || null,
    is_active: data.isActive,
  };

  const { error } = data.id
    ? await supabase.from("categories").update(payload).eq("id", data.id)
    : await supabase.from("categories").insert(payload);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireStaffUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/categories");
  return { success: true };
}
