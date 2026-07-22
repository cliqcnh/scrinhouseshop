import { z } from "zod";
import { id } from "@/lib/validations/common";

export const productVariantSchema = z.object({
  id: id().optional(),
  sku: z.string().trim().min(1, "SKU is required"),
  storage: z.string().trim().optional(),
  color: z.string().trim().optional(),
  price: z.number().min(0, "Price must be positive"),
  stockQuantity: z.number().int().min(0, "Stock can't be negative"),
});

export const productFormSchema = z.object({
  id: id().optional(),
  name: z.string().trim().min(2, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().optional(),
  categoryId: id("Select a category"),
  brandId: id().optional().or(z.literal("")),
  productType: z.enum(["phone", "accessory", "repair_part"]),
  condition: z.enum(["brand_new", "uk_used"]).optional().or(z.literal("")),
  sku: z.string().trim().min(1, "SKU is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  compareAtPrice: z.number().min(0).or(z.nan()).optional(),
  tags: z.string().trim().optional(),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  variants: z.array(productVariantSchema).min(1, "Add at least one variant"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
