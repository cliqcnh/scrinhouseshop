"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/actions/admin/products";

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this product? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.success) {
        toast.error(result.error ?? "Delete failed");
        return;
      }
      toast.success("Product deleted");
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDelete}>
      <Trash2 className="size-3.5" /> Delete
    </Button>
  );
}
