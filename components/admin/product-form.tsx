"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "variants">("basic");

  // Variant Attributes Configuration (e.g. Model for phone cases, Storage for phones)
  const [primaryAttributeName, setPrimaryAttributeName] = useState<string>(() => {
    if (initialValues?.variants?.some((v) => v.storage && !/gb|tb|mb/i.test(v.storage))) {
      return "Model";
    }
    return initialValues?.productType === "accessory" ? "Model" : "Storage";
  });
  const [secondaryAttributeName, setSecondaryAttributeName] = useState<string>("Color");

  // Bulk Variant Generation state
  const [bulkPrimaryValues, setBulkPrimaryValues] = useState("");
  const [bulkColors, setBulkColors] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues ? {
      ...initialValues,
      allowInstallments: initialValues.allowInstallments ?? true,
      installmentProfitPercentage: initialValues.installmentProfitPercentage ?? null,
      installmentDepositPercentage: initialValues.installmentDepositPercentage ?? null,
    } : {
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
      allowInstallments: true,
      installmentProfitPercentage: null,
      installmentDepositPercentage: null,
      variants: [EMPTY_VARIANT],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const productType = watch("productType");
  const nameValue = watch("name");
  const basePriceValue = watch("basePrice");
  const baseSkuValue = watch("sku");

  // Auto-slugify and Auto-SKU prefixing
  useEffect(() => {
    if (!initialValues && nameValue) {
      // 1. Auto slugify
      const generatedSlug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setValue("slug", generatedSlug, { shouldValidate: true });

      // 2. Auto SKU base prefix
      const generatedSku = nameValue
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setValue("sku", generatedSku, { shouldValidate: true });
    }
  }, [nameValue, initialValues, setValue]);

  useEffect(() => {
    if (!initialValues) {
      setValue("allowInstallments", productType === "phone");
      if (productType === "accessory") {
        setPrimaryAttributeName("Model");
      } else if (productType === "phone") {
        setPrimaryAttributeName("Storage");
      } else if (productType === "repair_part") {
        setPrimaryAttributeName("Device Model");
      }
    }
  }, [productType, initialValues, setValue]);

  // Bulk Variant Matrix Generator
  function handleGenerateVariants() {
    const primaryOptions = bulkPrimaryValues
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const colors = bulkColors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (primaryOptions.length === 0 && colors.length === 0) {
      toast.error(`Please enter at least one ${primaryAttributeName || "option"} or ${secondaryAttributeName || "color"} to generate.`);
      return;
    }

    const baseSku = baseSkuValue || "PROD";
    const basePrice = basePriceValue || 0;

    const newVariants: typeof EMPTY_VARIANT[] = [];
    const primaryList = primaryOptions.length > 0 ? primaryOptions : [""];
    const colorList = colors.length > 0 ? colors : [""];

    for (const opt of primaryList) {
      for (const color of colorList) {
        const suffixParts = [opt, color].filter(Boolean);
        const suffix = suffixParts.join("-").toUpperCase().replace(/[^A-Z0-9-]+/g, "");
        const variantSku = suffix ? `${baseSku}-${suffix}` : baseSku;

        newVariants.push({
          sku: variantSku,
          storage: opt || "",
          color: color || "",
          price: basePrice,
          stockQuantity: 10, // pre-fill with a default stock level
        });
      }
    }

    // Replace the variants list with the newly generated matrix
    setValue("variants", newVariants, { shouldValidate: true });
    toast.success(`Successfully generated ${newVariants.length} variants!`);
  }

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
    toast.success(initialValues ? "Product updated successfully" : "Product created successfully");
    router.push("/admin/products");
    router.refresh();
  }

  const tabs = [
    { id: "basic" as const, label: "Basic Info" },
    { id: "pricing" as const, label: "Pricing & Settings" },
    { id: "variants" as const, label: "Variants & Inventory" },
  ];

  function handleNext() {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id);
  }

  function handleBack() {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx > 0) setActiveTab(tabs[idx - 1].id);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Premium Horizontal Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-[2px] transition-all duration-200 ${
              activeTab === tab.id
                ? "border-foreground text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panel 1: Basic Info */}
      {activeTab === "basic" && (
        <section className="grid grid-cols-1 gap-5 rounded-none border border-border bg-white p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Name</Label>
            <Input id="name" {...register("name")} className="rounded-none border-border" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL Slug</Label>
            <Input id="slug" {...register("slug")} className="rounded-none border-border" />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sku" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base SKU Prefix</Label>
            <Input id="sku" {...register("sku")} className="rounded-none border-border" />
            {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
            <textarea
              id="description"
              rows={4}
              className="w-full rounded-none border border-border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
            <Select
              value={watch("categoryId")}
              onValueChange={(v) => v && setValue("categoryId", v, { shouldValidate: true })}
            >
              <SelectTrigger className="rounded-none border-border">
                <SelectValue placeholder="Select category">
                  {categories.find((c) => c.id === watch("categoryId"))?.name ?? "Select category"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="rounded-none">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand</Label>
            <Select
              value={watch("brandId") || undefined}
              onValueChange={(v) => setValue("brandId", v ?? "")}
            >
              <SelectTrigger className="rounded-none border-border">
                <SelectValue placeholder="Select brand (optional)">
                  {brands.find((b) => b.id === watch("brandId"))?.name ?? "Select brand (optional)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="rounded-none">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Type</Label>
            <Select
              value={watch("productType")}
              onValueChange={(v) => setValue("productType", v as ProductFormValues["productType"])}
            >
              <SelectTrigger className="rounded-none border-border">
                <SelectValue>
                  {PRODUCT_TYPE_LABELS[watch("productType")] ?? watch("productType")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="phone" className="rounded-none">Phone</SelectItem>
                <SelectItem value="accessory" className="rounded-none">Accessory</SelectItem>
                <SelectItem value="repair_part" className="rounded-none">Repair part</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</Label>
            <Select
              value={watch("condition") || undefined}
              onValueChange={(v) => setValue("condition", v as ProductFormValues["condition"])}
            >
              <SelectTrigger className="rounded-none border-border">
                <SelectValue placeholder="N/A">
                  {CONDITION_LABELS[watch("condition") || ""] ?? "N/A"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="brand_new" className="rounded-none">Brand new</SelectItem>
                <SelectItem value="uk_used" className="rounded-none">UK used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>
      )}

      {/* Tab Panel 2: Pricing & Settings */}
      {activeTab === "pricing" && (
        <section className="grid grid-cols-1 gap-5 rounded-none border border-border bg-white p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="basePrice" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Price (GH₵)</Label>
            <Input id="basePrice" type="number" step="0.01" {...register("basePrice", { valueAsNumber: true })} className="rounded-none border-border" />
            {errors.basePrice && <p className="text-xs text-destructive">{errors.basePrice.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compare-at Price (optional)</Label>
            <Input
              id="compareAtPrice"
              type="number"
              step="0.01"
              {...register("compareAtPrice", { valueAsNumber: true })}
              className="rounded-none border-border"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tags" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (comma-separated)</Label>
            <Input id="tags" placeholder="flagship, 5g, fast-charging" {...register("tags")} className="rounded-none border-border" />
          </div>

          <div className="flex items-center gap-2.5 p-2 border border-dashed border-border">
            <Checkbox
              checked={watch("isFeatured")}
              onCheckedChange={(v) => setValue("isFeatured", v === true)}
              id="isFeatured"
            />
            <Label htmlFor="isFeatured" className="text-xs font-semibold cursor-pointer">Featured Product (display on homepage hero/collections)</Label>
          </div>

          <div className="flex items-center gap-2.5 p-2 border border-dashed border-border">
            <Checkbox
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v === true)}
              id="isActive"
            />
            <Label htmlFor="isActive" className="text-xs font-semibold cursor-pointer">Active (visible to storefront customers immediately)</Label>
          </div>
        </section>
      )}

      {/* Tab Panel 3: Variants & Inventory */}
      {activeTab === "variants" && (
        <div className="space-y-6">
          {/* Variant Matrix Generator Dashboard */}
          <div className="rounded-none border border-border bg-[#fafafa] p-5 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Bulk Variant Matrix Generator
                </h3>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Customizable attributes for Phones, Cases, Parts & Accessories
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Generate variant combinations instantly (e.g. Model &times; Color for cases, or Storage &times; Color for phones).
              </p>
            </div>

            {/* Attribute Configurator */}
            <div className="border border-border/80 bg-white p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Primary Attribute Name
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Choose <strong>Model</strong> (for phone cases/accessories), <strong>Storage</strong> (for phones), or type a custom attribute name:
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["Model", "Storage", "Size", "Compatibility"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPrimaryAttributeName(preset)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold border transition-colors",
                        primaryAttributeName.toLowerCase() === preset.toLowerCase()
                          ? "bg-foreground text-background border-foreground shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                  <Input
                    value={primaryAttributeName}
                    onChange={(e) => setPrimaryAttributeName(e.target.value)}
                    placeholder="Custom attribute"
                    className="h-7 w-28 text-xs rounded-none border-border"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkPrimary" className="text-xs font-bold text-foreground">
                    {primaryAttributeName || "Model"} Options (comma-separated)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {primaryAttributeName.toLowerCase().includes("model")
                      ? "e.g. phone models"
                      : "primary attribute options"}
                  </span>
                </div>
                <Input
                  id="bulkPrimary"
                  placeholder={
                    primaryAttributeName.toLowerCase().includes("model")
                      ? "e.g. iPhone 15, iPhone 15 Pro, iPhone 15 Pro Max, iPhone 14, S24 Ultra"
                      : primaryAttributeName.toLowerCase().includes("storage")
                      ? "e.g. 128GB, 256GB, 512GB, 1TB"
                      : primaryAttributeName.toLowerCase().includes("size")
                      ? "e.g. Small, Medium, Large, XL"
                      : "e.g. Option 1, Option 2, Option 3"
                  }
                  value={bulkPrimaryValues}
                  onChange={(e) => setBulkPrimaryValues(e.target.value)}
                  className="rounded-none border-border bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkColors" className="text-xs font-bold text-foreground">
                    {secondaryAttributeName || "Color"} Options (comma-separated)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">optional secondary attribute</span>
                </div>
                <Input
                  id="bulkColors"
                  placeholder="e.g. Black, Clear, Blue, Natural Titanium, Gold"
                  value={bulkColors}
                  onChange={(e) => setBulkColors(e.target.value)}
                  className="rounded-none border-border bg-white"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateVariants}
              className="rounded-none bg-white font-semibold hover:bg-foreground hover:text-background transition-colors"
            >
              Generate Variants Matrix
            </Button>
          </div>

          {/* Variants Grid List */}
          <section className="rounded-none border border-border bg-white p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Variants Checklist ({fields.length})
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Customize individual variant attributes, prices, and stock counts below.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(EMPTY_VARIANT)}
                className="rounded-none font-semibold text-xs"
              >
                <Plus className="size-3.5" /> Add Row Manually
              </Button>
            </div>
            {errors.variants?.root && (
              <p className="my-2 text-xs text-destructive">{errors.variants.root.message}</p>
            )}

            {/* Desktop Table Headers */}
            <div className="hidden sm:grid sm:grid-cols-6 gap-2.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border border-border mb-2">
              <div className="sm:col-span-1">SKU</div>
              <div className="sm:col-span-1">{primaryAttributeName || "Model / Storage"}</div>
              <div className="sm:col-span-1">{secondaryAttributeName || "Color"}</div>
              <div className="sm:col-span-1">Price (GH₵)</div>
              <div className="sm:col-span-1">Stock Qty</div>
              <div className="sm:col-span-1 text-right">Action</div>
            </div>

            <div className="space-y-2.5">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2.5 rounded-none border border-border p-3 sm:grid-cols-6 items-center">
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground sm:hidden">SKU</Label>
                    <Input placeholder="SKU" {...register(`variants.${index}.sku`)} className="rounded-none text-xs border-border h-9" />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground sm:hidden">
                      {primaryAttributeName || "Model"}
                    </Label>
                    <Input
                      placeholder={primaryAttributeName || "Model / Storage"}
                      {...register(`variants.${index}.storage`)}
                      className="rounded-none text-xs border-border h-9"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground sm:hidden">
                      {secondaryAttributeName || "Color"}
                    </Label>
                    <Input
                      placeholder={secondaryAttributeName || "Color"}
                      {...register(`variants.${index}.color`)}
                      className="rounded-none text-xs border-border h-9"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground sm:hidden">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      {...register(`variants.${index}.price`, { valueAsNumber: true })}
                      className="rounded-none text-xs border-border h-9"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground sm:hidden">Stock</Label>
                    <Input
                      type="number"
                      placeholder="Stock"
                      {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                      className="rounded-none text-xs border-border h-9"
                    />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      aria-label="Remove variant"
                      className="rounded-none hover:bg-red-50 hover:text-red-600 size-9"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {submitError && <p className="text-sm text-destructive font-semibold">{submitError}</p>}

      {/* Navigation Footer */}
      <div className="flex justify-between items-center border-t border-border pt-5 mt-6">
        <div className="flex gap-2">
          {activeTab !== "basic" && (
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-none font-semibold text-xs">
              Back
            </Button>
          )}
          {activeTab !== tabs[tabs.length - 1].id ? (
            <Button type="button" onClick={handleNext} className="rounded-none font-semibold text-xs">
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="rounded-none font-semibold text-xs">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initialValues ? "Save Changes" : "Create Product"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {activeTab !== tabs[tabs.length - 1].id && (
            <Button type="submit" variant="ghost" disabled={isSubmitting} className="rounded-none text-xs font-semibold text-muted-foreground hover:text-foreground">
              Instant Save
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")} className="rounded-none text-xs font-semibold">
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
