import { BulkUploadForm } from "@/components/admin/bulk-upload-form";
import { getCategoryTree, listBrands } from "@/services/catalog-service";

export const metadata = { title: "Bulk Product Import - Admin" };

export default async function BulkImportPage() {
  const [categoryTree, brands] = await Promise.all([getCategoryTree(), listBrands()]);
  // Flatten tree to get parent and child categories safely
  const categories = (categoryTree || []).flatMap((c) => [c, ...(c.children || [])]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Bulk Product Import</h1>
        <p className="text-sm text-muted-foreground">
          Import multiple products, variants, and link their images simultaneously using a CSV spreadsheet.
        </p>
      </div>
      <BulkUploadForm categories={categories} brands={brands} />
    </div>
  );
}
