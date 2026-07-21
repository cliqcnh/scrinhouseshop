/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = { title: "Employees Management" };

export default async function AdminEmployeesPage() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      created_at,
      roles!inner (
        name,
        is_staff
      )
    `)
    .eq("roles.is_staff", true)
    .order("created_at", { ascending: true });

  const employees = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Employees</h1>
        <p className="text-sm text-muted-foreground">Directory of registered technicians, riders, and administrative staff.</p>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background">
          <UserCog className="size-10 text-muted-foreground/30" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">No employees found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-background rounded">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3.5 font-medium text-foreground">{emp.full_name ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase ${
                      emp.roles?.name === "admin" || emp.roles?.name === "super_admin"
                        ? "bg-red-500/10 text-red-700"
                        : emp.roles?.name === "technician"
                        ? "bg-blue-500/10 text-blue-700"
                        : "bg-gray-500/10 text-gray-700"
                    }`}>
                      {emp.roles?.name ?? "staff"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{formatDate(emp.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
