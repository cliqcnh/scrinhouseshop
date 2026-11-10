import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { listAdminProducts } from "@/services/admin-service";
import { ProductsListTable } from "@/components/admin/products-list-table";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/admin/products/bulk" />}>
            Bulk Import
          </Button>
          <Button render={<Link href="/admin/products/new" />}>
            <Plus className="size-4" /> Add product
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to get started." />
      ) : (
        <ProductsListTable initialProducts={products} />
      )}
    </div>
  );
}
