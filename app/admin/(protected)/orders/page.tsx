import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { listAdminOrders } from "@/actions/admin/orders";
import { formatDate, formatPrice } from "@/utils/format";

export const metadata: Metadata = { title: "Orders Management" };

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">Monitor checkout payments and shipping status.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background">
          <ShoppingCart className="size-10 text-muted-foreground/30" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">No orders found in the database.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-background rounded">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3.5 font-mono text-xs text-foreground font-semibold">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">
                    {order.paymentMethod}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      order.status === "paid" || order.status === "delivered"
                        ? "bg-green-500/10 text-green-700"
                        : order.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-700"
                    }`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
