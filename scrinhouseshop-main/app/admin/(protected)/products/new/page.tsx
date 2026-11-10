import { ProductForm } from "@/components/admin/product-form";
import { getCategoryTree, listBrands } from "@/services/catalog-service";

export const metadata = { title: "New Product" };

export default async function NewProductPage() {
  const [categoryTree, brands] = await Promise.all([getCategoryTree(), listBrands()]);
  const categories = categoryTree.flatMap((c) => [c, ...c.children]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">New product</h1>
        <p className="text-sm text-muted-foreground">Save the product first, then upload images.</p>
      </div>
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
