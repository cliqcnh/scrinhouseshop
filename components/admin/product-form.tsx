"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productFormSchema, type ProductFormValues } from "@/lib/validations/admin-product";
import { saveProduct } from "@/actions/admin/products";
import type { Category } from "@/types/catalog";

interface ProductFormProps {
  categories: Category[];
  brands: { id: string; name: string; slug: string }[];
  initialValues?: ProductFormValues;
}

const EMPTY_VARIANT = { sku: "", storage: "", color: "", price: 0, stockQuantity: 0 };

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  phone: "Phone",
  accessory: "Accessory",
  repair_part: "Repair part",
};

const CONDITION_LABELS: Record<string, string> = {
  brand_new: "Brand new",
  uk_used: "UK used",
};

export function ProductForm({ categories, brands, initialValues }: ProductFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues ?? {
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      brandId: "",
      productType: "phone",
      condition: "",
      sku: "",
      basePrice: 0,
      compareAtPrice: undefined,
      tags: "",
      isFeatured: false,
      isActive: true,
      variants: [EMPTY_VARIANT],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  async function onSubmit(values: ProductFormValues) {
    setSubmitError(null);
    if (values.compareAtPrice !== undefined && Number.isNaN(values.compareAtPrice)) {
      values.compareAtPrice = undefined;
    }
    const result = await saveProduct(values);
    if (!result.success) {
      setSubmitError(result.error ?? "Something went wrong");
      return;
    }
    toast.success(initialValues ? "Product updated" : "Product created");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register("slug")} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...register("sku")} />
          {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register("description")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={watch("categoryId")}
            onValueChange={(v) => v && setValue("categoryId", v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category">
                {(value: string) => categories.find((c) => c.id === value)?.name ?? "Select category"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select
            value={watch("brandId") || undefined}
            onValueChange={(v) => setValue("brandId", v ?? "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand (optional)">
                {(value: string) => brands.find((b) => b.id === value)?.name ?? "Select brand (optional)"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Product type</Label>
          <Select
            value={watch("productType")}
            onValueChange={(v) => setValue("productType", v as ProductFormValues["productType"])}
          >
            <SelectTrigger>
              <SelectValue>
                {(value: string) => PRODUCT_TYPE_LABELS[value] ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="accessory">Accessory</SelectItem>
              <SelectItem value="repair_part">Repair part</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select
            value={watch("condition") || undefined}
            onValueChange={(v) => setValue("condition", v as ProductFormValues["condition"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="N/A">
                {(value: string) => CONDITION_LABELS[value] ?? "N/A"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brand_new">Brand new</SelectItem>
              <SelectItem value="uk_used">UK used</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="basePrice">Base price (GH₵)</Label>
          <Input id="basePrice" type="number" step="0.01" {...register("basePrice", { valueAsNumber: true })} />
          {errors.basePrice && <p className="text-xs text-destructive">{errors.basePrice.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="compareAtPrice">Compare-at price (optional)</Label>
          <Input
            id="compareAtPrice"
            type="number"
            step="0.01"
            {...register("compareAtPrice", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" placeholder="flagship, 5g, fast-charging" {...register("tags")} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={watch("isFeatured")}
            onCheckedChange={(v) => setValue("isFeatured", v === true)}
            id="isFeatured"
          />
          <Label htmlFor="isFeatured">Featured</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={watch("isActive")}
            onCheckedChange={(v) => setValue("isActive", v === true)}
            id="isActive"
          />
          <Label htmlFor="isActive">Active (visible on storefront)</Label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Variants</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(EMPTY_VARIANT)}
          >
            <Plus className="size-3.5" /> Add variant
          </Button>
        </div>
        {errors.variants?.root && (
          <p className="mt-2 text-xs text-destructive">{errors.variants.root.message}</p>
        )}

        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-6">
              <Input placeholder="SKU" {...register(`variants.${index}.sku`)} />
              <Input placeholder="Storage" {...register(`variants.${index}.storage`)} />
              <Input placeholder="Color" {...register(`variants.${index}.color`)} />
              <Input
                type="number"
                step="0.01"
                placeholder="Price"
                {...register(`variants.${index}.price`, { valueAsNumber: true })}
              />
              <Input
                type="number"
                placeholder="Stock"
                {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                aria-label="Remove variant"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {initialValues ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
