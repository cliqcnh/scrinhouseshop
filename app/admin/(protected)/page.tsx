import Link from "next/link";
import { Package, FolderTree, Tag, AlertTriangle, PackageX, Star, DollarSign, ShoppingCart, Wrench } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardStats } from "@/services/admin-service";
import { formatPrice } from "@/utils/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics for catalog inventory, orders revenue, and device repairs.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {/* Sales & Orders */}
        <StatCard
          icon={DollarSign}
          label="Total Sales"
          value={formatPrice(stats.totalSales)}
        />
        <StatCard
          icon={ShoppingCart}
          label="Pending Orders"
          value={stats.pendingOrders}
          hint={`${stats.totalOrders} total orders`}
        />
        <StatCard
          icon={Wrench}
          label="Active Repairs"
          value={stats.activeRepairs}
        />
        
        {/* Catalog */}
        <StatCard
          icon={Package}
          label="Products"
          value={stats.totalProducts}
          hint={`${stats.activeProducts} active`}
        />
        <StatCard icon={FolderTree} label="Categories" value={stats.totalCategories} />
        <StatCard icon={Tag} label="Brands" value={stats.totalBrands} />
        <StatCard icon={Star} label="Reviews" value={stats.totalReviews} />
        <StatCard
          icon={AlertTriangle}
          label="Low stock variants"
          value={stats.lowStockVariants}
          hint="At or below threshold"
        />
        <StatCard
          icon={PackageX}
          label="Out of stock variants"
          value={stats.outOfStockVariants}
        />
      </div>

      <div className="rounded-lg border border-border bg-background p-5">
        <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/products/new"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Add product
          </Link>
          <Link
            href="/admin/categories"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Manage categories
          </Link>
          <Link
            href="/admin/brands"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Manage brands
          </Link>
        </div>
      </div>
    </div>
  );
}
