"use client";

import { useState, useEffect } from "react";
import { 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  DollarSign, 
  Filter,
  RefreshCw
} from "lucide-react";
import { getFinancialAuditData, type FinancialSummary } from "@/actions/admin/analytics";
import { formatPrice } from "@/utils/format";
import { toast } from "sonner";

export default function AnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialSummary>({
    totalSales: 0,
    totalRepairs: 0,
    totalWalletTransactions: 0,
    totalPayouts: 0,
    totalLockedInstallments: 0,
    totalCollectedInstallments: 0,
    totalCashSales: 0,
    events: [],
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getFinancialAuditData({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          category: category !== "all" ? category : undefined,
        });
        setData(res);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to load audit logs";
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [startDate, endDate, category, refreshTrigger]);

  function downloadCSV() {
    if (data.events.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = ["Date", "Description", "Category", "Flow", "Amount (GHS)", "Details"];
    const rows = data.events.map(e => [
      new Date(e.date).toLocaleString("en-GH"),
      `"${e.description.replace(/"/g, '""')}"`,
      e.category.toUpperCase(),
      e.flow.toUpperCase(),
      e.amount.toFixed(2),
      `"${(e.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `scrinhouse_financial_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report downloaded successfully!");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Earnings & Financial Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">Consolidated transactional audit ledgers and downloadable Excel/CSV reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 text-foreground cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-foreground/90 transition-colors cursor-pointer"
          >
            <Download className="size-4" />
            Download CSV Report
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sales */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>Orders Revenue</span>
            <DollarSign className="size-4" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalSales)}
          </span>
          <p className="text-xs text-muted-foreground">Paid orders & product sales</p>
        </div>

        {/* Repairs */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>Repair Earnings</span>
            <DollarSign className="size-4" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalRepairs)}
          </span>
          <p className="text-xs text-muted-foreground">Paid repair bookings</p>
        </div>

        {/* Net Wallet Flow */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>Wallet Ledger</span>
            <DollarSign className="size-4" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalWalletTransactions)}
          </span>
          <p className="text-xs text-muted-foreground">Credits & debits volume</p>
        </div>

        {/* Payouts */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>Withdrawals (Payouts)</span>
            <DollarSign className="size-4" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalPayouts)}
          </span>
          <p className="text-xs text-muted-foreground">Approved cash-out requests</p>
        </div>
      </div>

      {/* Hire Purchase / Installments Financial Ledger Overview */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Cash Sales */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Cash Sales (Direct)</span>
            <DollarSign className="size-4 text-green-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalCashSales)}
          </span>
          <p className="text-xs text-muted-foreground">Revenue paid in full at checkout</p>
        </div>

        {/* Collected Deposits */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Installment Deposits</span>
            <DollarSign className="size-4 text-yellow-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalCollectedInstallments)}
          </span>
          <p className="text-xs text-muted-foreground">Collected hire-purchase down payments</p>
        </div>

        {/* Locked Balances */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Locked Receivables</span>
            <DollarSign className="size-4 text-muted-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {formatPrice(data.totalLockedInstallments)}
          </span>
          <p className="text-xs text-muted-foreground">Pending installment balances to collect</p>
        </div>
      </div>

      {/* Installment Breakdown Visual Progress Chart */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">Revenue Distribution & Receivables</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Visual split between direct cash sales, collected hire-purchase deposits, and future locked installment balances</p>
        </div>

        <div className="space-y-4">
          <div className="h-6 w-full flex bg-muted rounded-none overflow-hidden">
            {(() => {
              const totalRev = (data.totalCashSales ?? 0) + (data.totalCollectedInstallments ?? 0) + (data.totalLockedInstallments ?? 0);
              if (totalRev === 0) {
                return (
                  <div className="w-full flex items-center justify-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    No Order Data Available
                  </div>
                );
              }

              const cashPct = ((data.totalCashSales ?? 0) / totalRev) * 100;
              const depositPct = ((data.totalCollectedInstallments ?? 0) / totalRev) * 100;
              const lockedPct = ((data.totalLockedInstallments ?? 0) / totalRev) * 100;

              return (
                <>
                  {data.totalCashSales > 0 && (
                    <div style={{ width: `${cashPct}%` }} className="bg-foreground h-full transition-all duration-500" title={`Cash Sales: ${cashPct.toFixed(1)}%`} />
                  )}
                  {data.totalCollectedInstallments > 0 && (
                    <div style={{ width: `${depositPct}%` }} className="bg-yellow-600 h-full transition-all duration-500" title={`Collected Deposits: ${depositPct.toFixed(1)}%`} />
                  )}
                  {data.totalLockedInstallments > 0 && (
                    <div style={{ width: `${lockedPct}%` }} className="bg-muted-foreground h-full transition-all duration-500" title={`Locked Balance: ${lockedPct.toFixed(1)}%`} />
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-6 text-xs justify-start">
            <div className="flex items-center gap-2">
              <div className="size-3 bg-foreground rounded-none" />
              <span className="font-semibold text-foreground">Cash Sales ({formatPrice(data.totalCashSales ?? 0)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-yellow-600 rounded-none" />
              <span className="font-semibold text-foreground">Installment Deposits ({formatPrice(data.totalCollectedInstallments ?? 0)})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-muted-foreground rounded-none" />
              <span className="font-semibold text-foreground">Locked Receivables ({formatPrice(data.totalLockedInstallments ?? 0)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-foreground focus:outline-none text-foreground"
              >
                <option value="all">All Categories</option>
                <option value="order">Orders (Purchases)</option>
                <option value="repair">Repairs (Services)</option>
                <option value="wallet">Wallet Transactions</option>
                <option value="payout">Payout Withdrawals</option>
              </select>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-foreground focus:outline-none text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-foreground focus:outline-none text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Audit Ledger Logs</h2>
          <p className="text-muted-foreground text-xs mt-0.5">Chronological record of verified monetary events</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mr-2" />
            Fetching financial logs...
          </div>
        ) : data.events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-foreground">No financial events found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-foreground">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Flow</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Auditor Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.events.map(event => (
                  <tr key={event.id} className="hover:bg-muted/10">
                    <td className="p-4 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleString("en-GH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-4 font-medium text-foreground">{event.description}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border uppercase tracking-wider ${
                        event.category === "order" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        event.category === "repair" ? "bg-orange-50 text-orange-700 border-orange-200" :
                        event.category === "wallet" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {event.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        event.flow === "in" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {event.flow === "in" ? (
                          <>
                            <ArrowUpRight className="size-3.5" />
                            INFLOW
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="size-3.5" />
                            OUTFLOW
                          </>
                        )}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      event.flow === "in" ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      {event.flow === "in" ? "+" : "-"}{formatPrice(event.amount)}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground max-w-xs truncate">
                      {event.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
