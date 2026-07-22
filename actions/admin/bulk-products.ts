"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";

export interface BulkImportProduct {
  name: string;
  slug: string;
  description?: string;
  categoryName: string;
  brandName?: string;
  productType: "phone" | "accessory" | "repair_part";
  condition?: "brand_new" | "uk_used" | "";
  sku: string;
  basePrice: number;
  compareAtPrice?: number;
  tags?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  variantsString?: string; // Format: "Storage/Color/SKU/Price/Stock;..."
  imageNames?: string; // Comma-separated list of filenames matching uploaded attachments
}

export interface BulkImportImage {
  name: string;
  base64: string;
  type: string;
}

export interface BulkImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

export async function importBulkProducts(
  products: BulkImportProduct[],
  images: BulkImportImage[],
): Promise<BulkImportResult> {
  await requireStaffUser();
  const supabase = await createClient();

  const errors: string[] = [];
  let importedCount = 0;

  // 1. Fetch categories & brands for lookup
  const { data: categories } = await supabase.from("categories").select("id, name, slug");
  const { data: brands } = await supabase.from("brands").select("id, name, slug");

  const categoryMap = new Map((categories ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const brandMap = new Map((brands ?? []).map((b) => [b.name.toLowerCase(), b.id]));

  // 2. Index the uploaded images by filename for quick lookup
  const imageMap = new Map<string, BulkImportImage>();
  for (const img of images) {
    imageMap.set(img.name.toLowerCase().trim(), img);
  }

  for (let idx = 0; idx < products.length; idx++) {
    const row = products[idx];
    const rowNum = idx + 2; // 1-indexed header offset

    try {
      // Basic validations
      const rawPrice = Number(row.basePrice);
      if (!row.name || !row.slug || !row.sku || isNaN(rawPrice) || rawPrice <= 0) {
        errors.push(`Row ${rowNum}: Missing or invalid required product info (Name, Slug, SKU, or a valid positive Base Price).`);
        continue;
      }

      // Check slug format
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) {
        errors.push(`Row ${rowNum}: Invalid slug "${row.slug}". Use lowercase alphanumeric characters and hyphens only.`);
        continue;
      }

      // Resolve Category ID
      const categoryId = categoryMap.get(row.categoryName.toLowerCase().trim());
      if (!categoryId) {
        errors.push(`Row ${rowNum}: Category "${row.categoryName}" not found in database.`);
        continue;
      }

      // Resolve Brand ID (optional)
      let brandId: string | null = null;
      if (row.brandName) {
        brandId = brandMap.get(row.brandName.toLowerCase().trim()) ?? null;
      }

      // Normalize condition format to match database enum ("brand_new" | "uk_used" | null)
      let conditionValue: "brand_new" | "uk_used" | null = null;
      if (row.condition) {
        const normalized = row.condition.trim().toLowerCase().replace(/[\s_-]+/g, "_");
        if (normalized === "brand_new" || normalized === "brandnew" || normalized === "new") {
          conditionValue = "brand_new";
        } else if (normalized === "uk_used" || normalized === "ukused" || normalized === "used") {
          conditionValue = "uk_used";
        }
      }

      // Normalize product_type format to match database enum ("phone" | "accessory" | "repair_part")
      let productTypeValue: "phone" | "accessory" | "repair_part" = "phone";
      if (row.productType) {
        const normalized = row.productType.trim().toLowerCase();
        if (normalized === "phone" || normalized === "phones") {
          productTypeValue = "phone";
        } else if (normalized === "accessory" || normalized === "accessories") {
          productTypeValue = "accessory";
        } else if (
          normalized === "repair_part" ||
          normalized === "repair" ||
          normalized === "part" ||
          normalized === "repair-part" ||
          normalized === "repairs"
        ) {
          productTypeValue = "repair_part";
        }
      }

      // Insert/Upsert product
      const productPayload = {
        category_id: categoryId,
        brand_id: brandId,
        name: row.name,
        slug: row.slug,
        description: row.description || null,
        product_type: productTypeValue,
        condition: conditionValue,
        sku: row.sku,
        base_price: Number(row.basePrice),
        compare_at_price: row.compareAtPrice ? Number(row.compareAtPrice) : null,
        tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        is_featured: !!row.isFeatured,
        is_active: row.isActive !== false,
      };

      const { data: insertedProduct, error: insertError } = await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();

      if (insertError) {
        errors.push(`Row ${rowNum} (${row.name}): Failed to insert product: ${insertError.message}`);
        continue;
      }

      const productId = insertedProduct.id;

      // Parse and insert variants
      const variantsToInsert: any[] = [];
      if (row.variantsString && row.variantsString.trim()) {
        const parts = row.variantsString.split(";");
        for (const part of parts) {
          if (!part.trim()) continue;
          const [storage, color, sku, price, stock] = part.split("/");
          if (!sku || !price) {
            errors.push(`Row ${rowNum} (${row.name}): Ignored variant "${part}" due to missing SKU or Price.`);
            continue;
          }
          variantsToInsert.push({
            product_id: productId,
            sku: sku.trim(),
            storage: storage ? storage.trim() : null,
            color: color ? color.trim() : null,
            price: Number(price),
            stock_quantity: stock ? parseInt(stock.trim(), 10) : 0,
          });
        }
      }

      // If no valid custom variants specified, create one default variant matching product SKU
      if (variantsToInsert.length === 0) {
        variantsToInsert.push({
          product_id: productId,
          sku: row.sku,
          storage: null,
          color: null,
          price: Number(row.basePrice),
          stock_quantity: 0,
        });
      }

      const { error: variantError } = await supabase.from("product_variants").insert(variantsToInsert);
      if (variantError) {
        errors.push(`Row ${rowNum} (${row.name}): Failed to insert variants: ${variantError.message}`);
        // Clean up orphaned product
        await supabase.from("products").delete().eq("id", productId);
        continue;
      }

      // Parse and upload associated images
      if (row.imageNames && row.imageNames.trim()) {
        const filenames = row.imageNames.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
        let uploadedImagesCount = 0;

        for (let idx = 0; idx < filenames.length; idx++) {
          const filename = filenames[idx];
          const match = imageMap.get(filename);

          if (match) {
            const buffer = Buffer.from(match.base64, "base64");
            const ext = match.name.split(".").pop() ?? "jpg";
            const storagePath = `${productId}/${nanoid()}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from("product-media")
              .upload(storagePath, buffer, {
                contentType: match.type,
                upsert: false,
              });

            if (uploadError) {
              errors.push(`Row ${rowNum} (${row.name}): Image upload failed for "${match.name}": ${uploadError.message}`);
              continue;
            }

            const { data: publicUrl } = supabase.storage.from("product-media").getPublicUrl(storagePath);

            const { error: imageInsertError } = await supabase.from("product_images").insert({
              product_id: productId,
              url: publicUrl.publicUrl,
              is_primary: uploadedImagesCount === 0,
              display_order: uploadedImagesCount,
            });

            if (imageInsertError) {
              errors.push(`Row ${rowNum} (${row.name}): Image record failed for "${match.name}": ${imageInsertError.message}`);
            } else {
              uploadedImagesCount++;
            }
          } else {
            errors.push(`Row ${rowNum} (${row.name}): Uploaded image zip/list did not contain matching filename "${filename}".`);
          }
        }
      }

      importedCount++;
    } catch (err: any) {
      errors.push(`Row ${rowNum}: Unexpected error: ${err.message}`);
    }
  }

  revalidatePath("/admin/products");
  return {
    success: errors.length === 0,
    importedCount,
    errors,
  };
}
