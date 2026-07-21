"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProductImage, uploadProductImage } from "@/actions/admin/products";
import type { ProductImage } from "@/types/catalog";

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (!result.success) toast.error(result.error ?? "Upload failed");
    });
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId, productId);
      if (!result.success) toast.error(result.error ?? "Delete failed");
    });
  }

  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" /> Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image src={image.url} alt={image.altText ?? ""} fill className="object-cover" sizes="150px" />
              {image.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                disabled={isPending}
                aria-label="Delete image"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
