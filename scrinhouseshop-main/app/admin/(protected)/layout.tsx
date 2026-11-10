import { LogOut } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { signOutStaff } from "@/actions/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffUser();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar (lg and up) */}
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Admin Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {staff.fullName ?? staff.email}
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                {staff.roleName.replace("_", " ")}
              </span>
            </span>
          </div>

          <form action={signOutStaff}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </header>

        {/* Main Content Area with Bottom Padding on Mobile for Fixed Nav */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">{children}</main>

        {/* Mobile App Bottom Navigation Bar for Admin (< lg screens) */}
        <AdminMobileBottomNav
          staffName={staff.fullName ?? staff.email}
          roleName={staff.roleName}
          signOutAction={signOutStaff}
        />
      </div>
    </div>
  );
}
