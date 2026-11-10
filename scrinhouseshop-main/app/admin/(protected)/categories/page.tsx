import { CategoryManager } from "@/components/admin/category-manager";
import { listAllCategories } from "@/services/admin-service";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await listAllCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground">{categories.length} categories</p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
