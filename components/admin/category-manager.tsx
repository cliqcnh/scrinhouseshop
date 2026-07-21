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
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validations/admin-taxonomy";
import { deleteCategory, saveCategory } from "@/actions/admin/categories";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema) });

  function openCreate() {
    setEditing(null);
    reset({ name: "", slug: "", description: "", parentId: "", isActive: true });
    setOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    reset({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ?? "",
      isActive: category.isActive,
    });
    setOpen(true);
  }

  async function onSubmit(values: CategoryFormValues) {
    const result = await saveCategory(values);
    if (!result.success) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }
    toast.success(editing ? "Category updated" : "Category created");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    const result = await deleteCategory(id);
    if (!result.success) {
      toast.error(result.error ?? "Delete failed");
      return;
    }
    toast.success("Category deleted");
    router.refresh();
  }

  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            <Plus className="size-4" /> Add category
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input id="cat-slug" {...register("slug")} />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-parent">Parent category</Label>
                <select
                  id="cat-parent"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={watch("parentId") ?? ""}
                  onChange={(e) => setValue("parentId", e.target.value)}
                >
                  <option value="">None (top-level)</option>
                  {topLevel
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={watch("isActive")}
                  onCheckedChange={(v) => setValue("isActive", v === true)}
                  id="cat-active"
                />
                <Label htmlFor="cat-active">Active</Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {editing ? "Save changes" : "Create category"}
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
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {category.parentId && <span className="mr-1 text-muted-foreground">—</span>}
                  {category.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{category.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(category)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
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
