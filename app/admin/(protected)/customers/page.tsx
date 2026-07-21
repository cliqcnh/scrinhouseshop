/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = { title: "Customers Management" };

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      created_at,
      roles!inner (
        name
      )
    `)
    .eq("roles.name", "customer")
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">Directory of registered store customer accounts.</p>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background">
          <Users className="size-10 text-muted-foreground/30" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">No registered customers found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-background rounded">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3.5 font-medium text-foreground">{cust.full_name ?? "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">{cust.phone ?? "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{formatDate(cust.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
