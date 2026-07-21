"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { productFormSchema, type ProductFormValues } from "@/lib/validations/admin-product";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function saveProduct(values: ProductFormValues): Promise<ActionResult> {
  await requireStaffUser();
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid form data" };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const productPayload = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    category_id: data.categoryId,
    brand_id: data.brandId || null,
    product_type: data.productType,
    condition: data.condition || null,
    sku: data.sku,
    base_price: data.basePrice,
    compare_at_price: data.compareAtPrice === undefined ? null : data.compareAtPrice,
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    is_featured: data.isFeatured,
    is_active: data.isActive,
  };

  let productId = data.id;

  if (productId) {
    const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
    if (error) return { success: false, error: error.message };
  } else {
    const { data: inserted, error } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    productId = inserted.id;
  }

  // Replace variants: delete removed ones, upsert the rest.
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const keepIds = new Set(data.variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = (existingVariants ?? []).filter((v) => !keepIds.has(v.id)).map((v) => v.id);
  if (toDelete.length > 0) {
    await supabase.from("product_variants").delete().in("id", toDelete);
  }

  for (const variant of data.variants) {
    const variantPayload = {
      product_id: productId,
      sku: variant.sku,
      storage: variant.storage || null,
      color: variant.color || null,
      price: variant.price,
      stock_quantity: variant.stockQuantity,
    };
    if (variant.id) {
      const { error } = await supabase
        .from("product_variants")
        .update(variantPayload)
        .eq("id", variant.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("product_variants").insert(variantPayload);
      if (error) return { success: false, error: error.message };
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/products");
  return { success: true };
}

export async function uploadProductImage(productId: string, formData: FormData): Promise<ActionResult> {
  await requireStaffUser();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };
  if (!file.type.startsWith("image/")) return { success: false, error: "File must be an image" };
  if (file.size > 5 * 1024 * 1024) return { success: false, error: "Image must be under 5MB" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${productId}/${nanoid()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("product-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { success: false, error: uploadError.message };

  const { data: publicUrl } = supabase.storage.from("product-media").getPublicUrl(path);

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: productId,
    url: publicUrl.publicUrl,
    is_primary: (count ?? 0) === 0,
    display_order: count ?? 0,
  });
  if (insertError) return { success: false, error: insertError.message };

  revalidatePath(`/admin/products/${productId}`);
  return { success: true };
}

export async function deleteProductImage(imageId: string, productId: string): Promise<ActionResult> {
  await requireStaffUser();
  const supabase = await createClient();

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/products/${productId}`);
  return { success: true };
}
