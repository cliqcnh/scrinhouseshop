import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-background p-8 shadow-sm">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">ScrinHouse Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your staff account.</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
