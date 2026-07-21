"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import type { ActionResult } from "@/actions/admin/products";

export async function saveSlide(formData: FormData): Promise<ActionResult> {
  await requireStaffUser();

  const id = formData.get("id") as string | null;
  const title = formData.get("title") as string | null;
  const subtitle = formData.get("subtitle") as string | null;
  const linkUrl = (formData.get("linkUrl") as string) || "/";
  const buttonText = (formData.get("buttonText") as string) || "Shop Now";
  const displayOrder = parseInt((formData.get("displayOrder") as string) || "0", 10);
  const isActive = formData.get("isActive") === "true";
  const imageFile = formData.get("imageFile") as File | null;
  let imageUrl = formData.get("imageUrl") as string | null;

  const supabase = await createClient();

  // If a new image file is provided, upload it first
  if (imageFile && imageFile.size > 0) {
    if (!imageFile.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be under 5MB" };
    }

    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `home-slides/${nanoid()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("product-media").upload(path, imageFile, {
      contentType: imageFile.type,
      upsert: false,
    });
    if (uploadError) return { success: false, error: uploadError.message };

    const { data: publicUrl } = supabase.storage.from("product-media").getPublicUrl(path);
    imageUrl = publicUrl.publicUrl;
  }

  if (!imageUrl) {
    return { success: false, error: "Image is required" };
  }

  const payload = {
    image_url: imageUrl,
    title: title || null,
    subtitle: subtitle || null,
    link_url: linkUrl,
    button_text: buttonText,
    display_order: displayOrder,
    is_active: isActive,
  };

  const { error } = id
    ? await supabase.from("home_slides").update(payload).eq("id", id)
    : await supabase.from("home_slides").insert(payload);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/slides");
  return { success: true };
}

export async function deleteSlide(id: string): Promise<ActionResult> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await supabase.from("home_slides").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/slides");
  return { success: true };
}
