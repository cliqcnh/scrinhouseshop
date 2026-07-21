import { LogOut } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import { signOutStaff } from "@/actions/admin/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffUser();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <span className="text-sm font-medium text-foreground">
            {staff.fullName ?? staff.email}
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {staff.roleName.replace("_", " ")}
            </span>
          </span>
          <form action={signOutStaff}>
            <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
