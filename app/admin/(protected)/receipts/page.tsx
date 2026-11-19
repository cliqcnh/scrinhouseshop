import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Receipt as ReceiptIcon, Wrench, ShoppingBag, ShieldCheck, Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAdminReceipts } from "@/actions/admin/receipts";
import { formatPrice, formatDate } from "@/utils/format";

export const metadata: Metadata = {
  title: "Receipts & Invoices | ScrinHouse Admin",
};

interface Props {
  searchParams: Promise<{ search?: string; type?: string }>;
}

export default async function AdminReceiptsPage({ searchParams }: Props) {
  const { search, type } = await searchParams;
  const receipts = await listAdminReceipts({ search, type });

  const totalRevenue = receipts.reduce((acc, r) => acc + r.totalAmount, 0);
  const repairCount = receipts.filter((r) => r.receiptType === "repair").length;
  const salesCount = receipts.filter((r) => r.receiptType === "sale").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Receipts & Invoices
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generate and verify official digital receipts for product sales, phone repairs, and service warranties.
          </p>
        </div>

        <Button
          size="sm"
          className="rounded-xl font-bold text-xs gap-1.5 shrink-0"
          render={<Link href="/admin/receipts/new" />}
        >
          <Plus className="size-4" />
          Generate New Receipt
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Receipts
          </span>
          <p className="font-heading text-2xl font-bold text-foreground">{receipts.length}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Repair Receipts
          </span>
          <div className="flex items-center gap-1.5 font-heading text-2xl font-bold text-foreground">
            <Wrench className="size-4 text-muted-foreground" />
            <span>{repairCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Sales Receipts
          </span>
          <div className="flex items-center gap-1.5 font-heading text-2xl font-bold text-foreground">
            <ShoppingBag className="size-4 text-muted-foreground" />
            <span>{salesCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Volume
          </span>
          <p className="font-heading text-xl sm:text-2xl font-bold text-foreground truncate">
            {formatPrice(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Receipts" },
            { id: "repair", label: "Repairs" },
            { id: "sale", label: "Product Sales" },
            { id: "custom", label: "Custom" },
          ].map((tab) => {
            const active = (type ?? "all") === tab.id;
            const queryParams = new URLSearchParams();
            if (tab.id !== "all") queryParams.set("type", tab.id);
            if (search) queryParams.set("search", search);

            return (
              <Link
                key={tab.id}
                href={`/admin/receipts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search input */}
        <form className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search by receipt #, customer, phone..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {type && <input type="hidden" name="type" value={type} />}
        </form>
      </div>

      {/* Receipts List */}
      {receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-2xl bg-card space-y-3">
          <ReceiptIcon className="size-10 text-muted-foreground/30" />
          <h3 className="font-heading text-sm font-bold text-foreground">No receipts found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search
              ? "No receipts matched your search query. Try searching by phone or receipt reference."
              : "Generate customer receipts for phone purchases and certified repairs with scannable QR verification."}
          </p>
          <Button
            size="sm"
            className="rounded-xl text-xs font-semibold"
            render={<Link href="/admin/receipts/new" />}
          >
            Create First Receipt
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Receipt Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Device / Type</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Warranty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    {/* Reference */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/receipts/${r.id}`}
                        className="font-mono font-bold text-foreground hover:underline"
                      >
                        #{r.receiptNumber}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</p>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-foreground">{r.customerName}</p>
                      <p className="font-mono text-muted-foreground text-[11px]">{r.customerPhone}</p>
                    </td>

                    {/* Device / Type */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {r.receiptType === "repair" ? (
                          <span className="rounded bg-blue-500/10 text-blue-700 font-semibold px-2 py-0.5 text-[10px] uppercase">
                            Repair
                          </span>
                        ) : (
                          <span className="rounded bg-neutral-500/10 text-neutral-700 font-semibold px-2 py-0.5 text-[10px] uppercase">
                            Sale
                          </span>
                        )}
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {r.deviceModel || `${r.items.length} items`}
                        </span>
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-foreground font-mono">{formatPrice(r.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{r.paymentMethod}</p>
                    </td>

                    {/* Warranty */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <ShieldCheck className="size-3 text-emerald-600" />
                        {r.warrantyDuration}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.paymentStatus === "paid"
                            ? "bg-green-500/10 text-green-700"
                            : r.paymentStatus === "partial"
                            ? "bg-yellow-500/10 text-yellow-700"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/receipts/${r.id}`}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                        >
                          <Printer className="size-3" />
                          <span>View & Print</span>
                        </Link>
                        <Link
                          href={`/verify/receipt/${r.receiptNumber}`}
                          target="_blank"
                          title="Verify online"
                          className="rounded-lg border border-border p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
