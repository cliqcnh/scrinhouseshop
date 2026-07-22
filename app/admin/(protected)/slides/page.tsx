import { SlideManager } from "@/components/admin/slide-manager";
import { listAllSlidesAdmin, listAdminProducts } from "@/services/admin-service";

export const metadata = { title: "Homepage Slides" };

export default async function AdminSlidesPage() {
  const [slides, products] = await Promise.all([
    listAllSlidesAdmin(),
    listAdminProducts()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Homepage Slides</h1>
        <p className="text-sm text-muted-foreground">{slides.length} slides uploaded</p>
      </div>
      <SlideManager slides={slides} products={products} />
    </div>
  );
}
