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
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId)?.name ?? null;
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium sm:hidden">
            {categories.length} total categories
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 font-semibold">
          <Plus className="size-4" /> Add Category
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1 pb-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input id="cat-name" placeholder="e.g. Smartwatches" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">URL Slug</Label>
                <Input id="cat-slug" placeholder="e.g. smartwatches" {...register("slug")} />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-parent">Parent Category</Label>
                <select
                  id="cat-parent"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={watch("parentId") ?? ""}
                  onChange={(e) => setValue("parentId", e.target.value)}
                >
                  <option value="">None (Top-Level Category)</option>
                  {topLevel
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  checked={watch("isActive")}
                  onCheckedChange={(v) => setValue("isActive", v === true)}
                  id="cat-active"
                />
                <Label htmlFor="cat-active" className="cursor-pointer">Active (Visible on Storefront)</Label>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full font-semibold">
                {editing ? "Save Changes" : "Create Category"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Mobile View: Touch-Friendly Card List ── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {categories.map((category) => {
          const parentName = getParentName(category.parentId);
          return (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-4 shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="space-y-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm">{category.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      category.isActive
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">/{category.slug}</p>
                {parentName && (
                  <p className="text-[11px] text-muted-foreground">
                    Parent: <span className="font-medium text-foreground">{parentName}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(category)}
                  className="size-8 p-0"
                >
                  <Pencil className="size-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  className="size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop View: Full Table ── */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground bg-muted/20">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">
                  {category.parentId && <span className="mr-1.5 text-muted-foreground font-mono">└─</span>}
                  {category.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{category.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      category.isActive
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(category)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
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
