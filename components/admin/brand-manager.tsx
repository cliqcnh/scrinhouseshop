"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { brandFormSchema, type BrandFormValues } from "@/lib/validations/admin-taxonomy";
import { deleteBrand, saveBrand } from "@/actions/admin/brands";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export function BrandManager({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BrandRow | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<BrandFormValues>({ resolver: zodResolver(brandFormSchema) });

  function openCreate() {
    setEditing(null);
    reset({ name: "", slug: "", isActive: true });
    setOpen(true);
  }

  function openEdit(brand: BrandRow) {
    setEditing(brand);
    reset({ id: brand.id, name: brand.name, slug: brand.slug, isActive: brand.isActive });
    setOpen(true);
  }

  async function onSubmit(values: BrandFormValues) {
    const result = await saveBrand(values);
    if (!result.success) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }
    toast.success(editing ? "Brand updated" : "Brand created");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this brand?")) return;
    const result = await deleteBrand(id);
    if (!result.success) {
      toast.error(result.error ?? "Delete failed");
      return;
    }
    toast.success("Brand deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            <Plus className="size-4" /> Add brand
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit brand" : "New brand"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">Name</Label>
                <Input id="brand-name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand-slug">Slug</Label>
                <Input id="brand-slug" {...register("slug")} />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={watch("isActive")}
                  onCheckedChange={(v) => setValue("isActive", v === true)}
                  id="brand-active"
                />
                <Label htmlFor="brand-active">Active</Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {editing ? "Save changes" : "Create brand"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{brand.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{brand.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{brand.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(brand)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(brand.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
