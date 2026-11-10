import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Calendar, MapPin, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackOrder } from "@/actions/storefront/dashboard";
import { formatDate, formatPrice } from "@/utils/format";

export const metadata: Metadata = { title: "Track Order" };

interface Props {
  searchParams: Promise<{ ref?: string }>;
}

const TRACKING_STEPS = [
  { status: "pending_payment", label: "Order Placed", desc: "Your order has been registered and is awaiting payment confirmation." },
  { status: "paid", label: "Paid", desc: "Payment successfully verified." },
  { status: "processing", label: "Processing", desc: "Our team is prepping and packaging your items." },
  { status: "shipped", label: "Shipped / In Transit", desc: "Your package is on its way to the delivery address." },
  { status: "delivered", label: "Delivered", desc: "Package has been successfully handed over." },
];

export default async function TrackPage({ searchParams }: Props) {
  const { ref } = await searchParams;

  let result = null;
  if (ref) {
    result = await trackOrder(ref);
  }

  // Determine active step index based on order status
  const getActiveStepIndex = (status: string) => {
    switch (status) {
      case "pending_payment":
        return 0;
      case "paid":
        return 1;
      case "processing":
        return 2;
      case "shipped":
        return 3;
      case "delivered":
        return 4;
      case "cancelled":
      case "refunded":
        return -1;
      default:
        return 0;
    }
  };

  const activeIndex = result?.success && result.order ? getActiveStepIndex(result.order.status) : -1;
  const isCancelled = result?.success && result.order && (result.order.status === "cancelled" || result.order.status === "refunded");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <PackageSearch className="size-10 mx-auto text-foreground" strokeWidth={1.5} />
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Track your order</h1>
        <p className="text-sm text-muted-foreground">
          Enter your Order ID (from your confirmation email) or Paystack reference to see live tracking status.
        </p>
      </div>

      {/* Search Input Box */}
      <form method="GET" className="mt-8 flex gap-3 max-w-md mx-auto">
        <Input
          name="ref"
          type="text"
          defaultValue={ref ?? ""}
          placeholder="e.g. 0aac0aeb-1e6e..."
          className="rounded-none border-border"
          required
        />
        <Button type="submit" className="rounded-none px-6">
          Track
        </Button>
      </form>

      {/* Tracking Results */}
      {ref && (
        <div className="mt-12 space-y-8">
          {!result?.success || !result.order ? (
            <div className="border border-border p-6 text-center text-sm text-muted-foreground">
              {result?.error ?? "No order found matching this tracking reference."}
            </div>
          ) : (
            <>
              {/* Reference Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Order Reference</h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{result.order.id}</p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right flex sm:flex-col gap-2 sm:gap-0.5">
                  <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {formatDate(result.order.createdAt)}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="capitalize font-semibold text-foreground">{result.order.status.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Status Timeline */}
              {isCancelled ? (
                <div className="border border-destructive/20 bg-destructive/5 text-destructive p-5 text-sm text-center">
                  <h3 className="font-semibold capitalize">Order {result.order.status}</h3>
                  <p className="text-xs mt-1 text-destructive/80">This order has been cancelled or refunded. If you have questions, please contact ScrinHouse support.</p>
                </div>
              ) : (
                <div className="border border-border p-6 sm:p-8 space-y-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Delivery Progress</h3>
                  
                  <div className="relative pl-6 sm:pl-0 sm:grid sm:grid-cols-5 gap-4">
                    {/* Line for timeline */}
                    <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border sm:hidden" />
                    
                    {TRACKING_STEPS.map((step, idx) => {
                      const completed = idx <= activeIndex;
                      const active = idx === activeIndex;
                      
                      return (
                        <div key={idx} className="relative pb-6 sm:pb-0 sm:text-center space-y-2">
                          {/* Circle marker */}
                          <div className={`absolute -left-[23px] sm:relative sm:left-0 sm:mx-auto flex size-5 items-center justify-center rounded-full border text-[10px] font-bold transition-colors z-10 ${
                            completed 
                              ? "bg-foreground text-background border-foreground" 
                              : "bg-background text-muted-foreground border-border"
                          }`}>
                            {completed ? (
                              <CheckCircle2 className="size-3 text-background fill-foreground" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          
                          {/* Label */}
                          <div className="sm:pt-2">
                            <p className={`text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug mt-1 hidden sm:block">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shipping & Items Details grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Shipping info */}
                <section className="border border-border p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <MapPin className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Address</h3>
                  </div>
                  <dl className="text-sm space-y-1.5">
                    <div>
                      <dt className="text-xs text-muted-foreground">Recipient Name</dt>
                      <dd className="font-semibold text-foreground mt-0.5">{result.order.deliveryAddress.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Phone Number</dt>
                      <dd className="text-foreground mt-0.5">{result.order.deliveryAddress.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">City & Region</dt>
                      <dd className="text-foreground mt-0.5">{result.order.deliveryAddress.city}, {result.order.deliveryAddress.region} Region</dd>
                    </div>
                    {result.order.deliveryAddress.landmark && (
                      <div>
                        <dt className="text-xs text-muted-foreground">Nearby Landmark</dt>
                        <dd className="text-foreground mt-0.5 italic text-xs">{result.order.deliveryAddress.landmark}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Items info */}
                <section className="border border-border p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Items Checked Out</h3>
                  </div>
                  <ul className="divide-y divide-border text-sm max-h-[220px] overflow-y-auto pr-1">
                    {result.order.items.map((item, idx) => (
                      <li key={idx} className="py-2.5 first:pt-0 last:pb-0 flex justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.variantLabel && `${item.variantLabel} · `}Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground shrink-0">{formatPrice(item.price * item.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
