"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrderStatus, assignProductWarranty } from "@/actions/admin/orders";
import { formatPrice } from "@/utils/format";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  price: number;
  registeredSerial: string | null;
}

interface OrderDetails {
  id: string;
  userEmail: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    landmark?: string | null;
  } | null;
  paymentMethod: string;
  paystackRef: string | null;
  createdAt: string;
  customerProfile: {
    fullName: string;
    phone: string;
  } | null;
  items: OrderItem[];
}

export function OrderDetailsClient({ order }: { order: OrderDetails }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [statusLoading, setStatusLoading] = useState(false);

  // Serial inputs mapping orderItemId -> serial string
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [serialLoaders, setSerialLoaders] = useState<Record<string, boolean>>({});

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true);
    const result = await updateOrderStatus(order.id, newStatus);
    setStatusLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update order status.");
    } else {
      setStatus(newStatus);
      toast.success("Order status updated successfully.");
      router.refresh();
    }
  }

  async function handleRegisterWarranty(itemId: string) {
    const serial = serials[itemId]?.trim();
    if (!serial) {
      toast.error("Please enter a valid IMEI or serial number.");
      return;
    }

    setSerialLoaders((prev) => ({ ...prev, [itemId]: true }));
    const result = await assignProductWarranty(itemId, serial);
    setSerialLoaders((prev) => ({ ...prev, [itemId]: false }));

    if (!result.success) {
      toast.error(result.error ?? "Failed to register warranty.");
    } else {
      toast.success("IMEI recorded & warranty registered!");
      router.refresh();
    }
  }

  const labelCls = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/admin/orders")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to orders
        </button>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ref: {order.paystackRef ?? "test-mode"}</p>
        </div>

        {/* Status updater */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Order Status:</span>
          <select
            value={status}
            disabled={statusLoading}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="pending_payment">Pending Payment</option>
            <option value="paid">Paid (Processing)</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Side: Order items list (col-span-2) */}
        <div className="md:col-span-2 space-y-6">
          <section className="border border-border p-5 space-y-4 bg-background">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Order Items</h2>
            <ul className="divide-y divide-border text-sm">
              {order.items.map((item) => {
                const isPhone = item.productName.toLowerCase().includes("iphone") || item.productName.toLowerCase().includes("phone");
                return (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantLabel && `${item.variantLabel} · `}Qty: {item.quantity} · {formatPrice(item.price)} each
                      </p>
                    </div>
                    
                    {/* IMEI / Warranty generator section */}
                    {isPhone && (
                      <div className="flex items-center gap-2 max-w-xs w-full sm:justify-end">
                        {item.registeredSerial ? (
                          <div className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-700 px-2.5 py-1 font-semibold rounded-full border border-green-500/20">
                            <ShieldCheck className="size-3.5" />
                            <span>IMEI: {item.registeredSerial}</span>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 w-full">
                            <Input
                              type="text"
                              value={serials[item.id] ?? ""}
                              onChange={(e) => setSerials((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Enter IMEI / Serial"
                              className="h-8 text-xs rounded-none border-border max-w-[150px]"
                            />
                            <Button
                              type="button"
                              onClick={() => handleRegisterWarranty(item.id)}
                              disabled={serialLoaders[item.id]}
                              size="sm"
                              className="h-8 text-[11px] rounded-none px-2 shrink-0"
                            >
                              {serialLoaders[item.id] ? "Saving..." : "Register"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Pricing summary */}
          <section className="border border-border p-5 space-y-3 bg-background">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Order Totals</h2>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side: Customer & Delivery Address */}
        <div className="space-y-6">
          <section className="border border-border p-5 space-y-3 bg-background">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Customer Profile</h2>
            <div className="text-xs space-y-2">
              <div>
                <p className={labelCls}>Name</p>
                <p className="text-foreground font-semibold mt-0.5">
                  {order.customerProfile?.fullName ?? "Guest"}
                </p>
              </div>
              <div>
                <p className={labelCls}>Email</p>
                <p className="text-foreground font-medium mt-0.5 truncate">{order.userEmail}</p>
              </div>
              {order.customerProfile?.phone && (
                <div>
                  <p className={labelCls}>Phone</p>
                  <p className="text-foreground font-medium mt-0.5">{order.customerProfile.phone}</p>
                </div>
              )}
            </div>
          </section>

          <section className="border border-border p-5 space-y-3 bg-background">
            <div className="flex items-center gap-1.5">
              <Truck className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Address</h2>
            </div>
            {order.deliveryAddress ? (
              <div className="text-xs space-y-2">
                <div>
                  <p className={labelCls}>Recipient Name</p>
                  <p className="text-foreground font-semibold mt-0.5">{order.deliveryAddress.fullName}</p>
                </div>
                <div>
                  <p className={labelCls}>Phone</p>
                  <p className="text-foreground font-medium mt-0.5">{order.deliveryAddress.phone}</p>
                </div>
                <div>
                  <p className={labelCls}>City / Region</p>
                  <p className="text-foreground font-medium mt-0.5">
                    {order.deliveryAddress.city}, {order.deliveryAddress.region} Region
                  </p>
                </div>
                {order.deliveryAddress.landmark && (
                  <div>
                    <p className={labelCls}>Nearby Landmark</p>
                    <p className="text-foreground font-medium mt-0.5 italic">{order.deliveryAddress.landmark}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No address recorded (Walk-in or test data).</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
