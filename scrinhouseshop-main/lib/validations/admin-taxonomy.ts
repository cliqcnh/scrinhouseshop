import { z } from "zod";
import { id } from "@/lib/validations/common";

export const categoryFormSchema = z.object({
  id: id().optional(),
  name: z.string().trim().min(2, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().trim().optional(),
  parentId: id().optional().or(z.literal("")),
  isActive: z.boolean(),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const brandFormSchema = z.object({
  id: id().optional(),
  name: z.string().trim().min(2, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  isActive: z.boolean(),
});
export type BrandFormValues = z.infer<typeof brandFormSchema>;
