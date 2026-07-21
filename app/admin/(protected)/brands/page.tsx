import { BrandManager } from "@/components/admin/brand-manager";
import { listAllBrands } from "@/services/admin-service";

export const metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  const brands = await listAllBrands();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Brands</h1>
        <p className="text-sm text-muted-foreground">{brands.length} brands</p>
      </div>
      <BrandManager brands={brands} />
    </div>
  );
}
