import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { getCategoryTree, listBrands } from "@/services/catalog-service";
import { getAdminProductById } from "@/services/admin-service";

export const metadata = { title: "Edit Product" };

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, categoryTree, brands] = await Promise.all([
    getAdminProductById(id),
    getCategoryTree(),
    listBrands(),
  ]);

  if (!product) notFound();

  const categories = categoryTree.flatMap((c) => [c, ...c.children]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Edit product</h1>
          <p className="text-sm text-muted-foreground">{product.formValues.name}</p>
        </div>
        <DeleteProductButton productId={id} />
      </div>
      <ProductImages productId={id} images={product.images} />
      <ProductForm categories={categories} brands={brands} initialValues={product.formValues} />
    </div>
  );
}
