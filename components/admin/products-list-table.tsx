"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2, Eye, EyeOff, Star, StarOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/utils/format";
import { bulkUpdateProducts } from "@/actions/admin/products";
import type { AdminProductRow } from "@/services/admin-service";

interface ProductsListTableProps {
  initialProducts: AdminProductRow[];
}

export function ProductsListTable({ initialProducts }: ProductsListTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Toggle single selection
  function handleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Toggle select all
  function handleSelectAll() {
    if (selectedIds.length === initialProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(initialProducts.map((p) => p.id));
    }
  }

  // Handle bulk action
  async function handleBulkAction(action: "delete" | "active" | "inactive" | "featured" | "unfeatured") {
    if (selectedIds.length === 0) return;
    setProcessing(true);

    try {
      const res = await bulkUpdateProducts(selectedIds, action);
      if (!res.success) {
        toast.error(res.error ?? "Failed to perform bulk update.");
        return;
      }

      toast.success(`Successfully updated ${selectedIds.length} products.`);
      setSelectedIds([]);
      setShowConfirmDelete(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Bulk Actions Floating Toolbar ── */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Check className="size-4" />
            <span>{selectedIds.length} {selectedIds.length === 1 ? "product" : "products"} selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => handleBulkAction("active")}
              className="gap-1.5 text-xs"
            >
              <Eye className="size-3.5" /> Mark Active
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => handleBulkAction("inactive")}
              className="gap-1.5 text-xs"
            >
              <EyeOff className="size-3.5" /> Mark Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => handleBulkAction("featured")}
              className="gap-1.5 text-xs"
            >
              <Star className="size-3.5 text-yellow-500 fill-yellow-500" /> Feature
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={processing}
              onClick={() => handleBulkAction("unfeatured")}
              className="gap-1.5 text-xs"
            >
              <StarOff className="size-3.5" /> Remove Featured
            </Button>
            
            {showConfirmDelete ? (
              <div className="flex items-center gap-1.5 bg-destructive/10 p-1 rounded border border-destructive/20 animate-in zoom-in-95 duration-100">
                <span className="text-xs text-destructive font-semibold px-2">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="xs"
                  disabled={processing}
                  onClick={() => handleBulkAction("delete")}
                  className="text-xs px-2.5"
                >
                  {processing ? <Loader2 className="size-3 animate-spin" /> : "Yes, Delete"}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={processing}
                  onClick={() => setShowConfirmDelete(false)}
                  className="text-xs px-2.5"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                disabled={processing}
                onClick={() => setShowConfirmDelete(true)}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="size-3.5" /> Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Products List Table ── */}
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground bg-muted/10">
              <th className="w-12 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={initialProducts.length > 0 && selectedIds.length === initialProducts.length}
                  onChange={handleSelectAll}
                  className="size-4 rounded border-gray-300 accent-primary cursor-pointer align-middle"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <tr
                  key={product.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${
                    isSelected ? "bg-primary/5 hover:bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(product.id)}
                      className="size-4 rounded border-gray-300 accent-primary cursor-pointer align-middle"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted border border-border">
                        {product.primaryImageUrl && (
                          <Image src={product.primaryImageUrl} alt="" fill className="object-cover" sizes="40px" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground hover:underline">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground font-semibold">{formatPrice(product.basePrice)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.totalStock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Active" : "Draft"}
                      </Badge>
                      {product.isFeatured && (
                        <Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/5 text-yellow-700 dark:text-yellow-500">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
