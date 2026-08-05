import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/utils/format";
import { PaymentRetryButton } from "./payment-retry-button";

interface OrderItemRow {
  id: string;
  product_name: string;
  variant_label: string | null;
  image_url: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

interface OrderRow {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  paystack_ref: string | null;
  delivery_address: Record<string, string | undefined>;
  created_at: string;
  is_installment: boolean;
  order_items: OrderItemRow[];
}

export const metadata: Metadata = { title: "Order Details" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string; mock?: string }>;
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { mock } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Load order with items
  const { data: orderRaw } = await supabase
    .from("orders")
    .select(`
      id, status, subtotal, delivery_fee, total, paystack_ref,
      delivery_address, created_at, is_installment,
      order_items ( id, product_name, variant_label, image_url, price, quantity, subtotal )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orderRaw) notFound();
  const order = orderRaw as unknown as OrderRow;
  const address = order.delivery_address || {};

  const isMock = mock === "1";
  const isPendingPayment = order.status === "pending_payment";

  let installmentStatus = "pending_review";
  if (order.is_installment) {
    const { data: apps } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("installment_applications") as any)
      .select("status")
      .eq("order_id", id);
    
    if (apps && apps.length > 0) {
      const hasUnapproved = apps.some((a: { status: string }) => a.status !== "approved");
      const hasRejected = apps.some((a: { status: string }) => a.status === "rejected");
      if (hasRejected) {
        installmentStatus = "rejected";
      } else if (hasUnapproved) {
        installmentStatus = "pending_review";
      } else {
        installmentStatus = "approved";
      }
    }
  }

  let displayTitle = "Order confirmed!";
  let displayIcon = <CheckCircle className="mx-auto mb-4 size-12 text-foreground" strokeWidth={1.5} />;
  let displayDescription = "Thank you for your order. We'll send you an update when it ships.";

  if (isPendingPayment) {
    if (order.is_installment) {
      if (installmentStatus === "pending_review") {
        displayTitle = "Application Pending Review";
        displayIcon = <AlertCircle className="mx-auto mb-4 size-12 text-yellow-600" strokeWidth={1.5} />;
        displayDescription = "Your installment application is currently pending review. We will notify you once our team reviews your Ghana Card details. Payment will be enabled once approved.";
      } else if (installmentStatus === "rejected") {
        displayTitle = "Application Rejected";
        displayIcon = <AlertCircle className="mx-auto mb-4 size-12 text-red-600" strokeWidth={1.5} />;
        displayDescription = "Unfortunately, your hire-purchase installment application was rejected. Please contact support for details.";
      } else {
        displayTitle = "Application Approved";
        displayIcon = <CheckCircle className="mx-auto mb-4 size-12 text-foreground" strokeWidth={1.5} />;
        displayDescription = "Your application has been approved! Please pay the down payment below to complete your order.";
      }
    } else {
      displayTitle = "Payment Pending";
      displayIcon = <AlertCircle className="mx-auto mb-4 size-12 text-yellow-600" strokeWidth={1.5} />;
      displayDescription = "Your payment is pending. Please complete payment using the button below to secure your items.";
    }
  } else if (isMock) {
    displayTitle = "Order placed (test mode)";
    displayDescription = "No real payment was taken. Add a Paystack secret key to enable live payments.";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Success / Pending header */}
      <div className="mb-10 text-center">
        {displayIcon}
        
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          {displayTitle}
        </h1>
        
        <p className="mt-2 text-sm text-muted-foreground">
          {displayDescription}
        </p>

        {isPendingPayment && (
          order.is_installment ? (
            installmentStatus === "approved" ? (
              <div className="mx-auto mt-6 max-w-sm border border-border p-4 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-3 text-left">
                  Down Payment Due: <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
                </p>
                <PaymentRetryButton orderId={order.id} />
              </div>
            ) : installmentStatus === "rejected" ? (
              <div className="mx-auto mt-6 max-w-sm border border-red-200 p-4 bg-red-50 text-center rounded-none">
                <p className="text-sm font-semibold text-red-700">Application Rejected</p>
                <p className="text-xs text-red-600 mt-1">This installment application was not approved.</p>
              </div>
            ) : (
              <div className="mx-auto mt-6 max-w-sm border border-border p-4 bg-muted/20 text-center rounded-none">
                <p className="text-sm font-semibold text-foreground">Awaiting Approval</p>
                <p className="text-xs text-muted-foreground mt-1">Our team is reviewing your application. Down payment will be enabled once approved.</p>
              </div>
            )
          ) : (
            <div className="mx-auto mt-6 max-w-sm border border-border p-4 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-3 text-left">
                Amount Due: <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
              </p>
              <PaymentRetryButton orderId={order.id} />
            </div>
          )
        )}

        {order.paystack_ref && (
          <p className="mt-3 text-xs text-muted-foreground">
            Reference: <span className="font-mono font-medium text-foreground">{order.paystack_ref}</span>
          </p>
        )}
      </div>

      {/* Order details */}
      <div className="space-y-6">
        {/* Items */}
        <section className="border border-border">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Items ordered</h2>
          </div>
          <ul className="divide-y divide-border">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                  {item.variant_label && (
                    <p className="text-xs text-muted-foreground">{item.variant_label}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-foreground">
                  {formatPrice(item.subtotal)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Totals */}
        <section className="border border-border px-5 py-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : "Free"}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </section>

        {/* Delivery address */}
        <section className="border border-border px-5 py-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Delivery address</h2>
          <address className="not-italic text-sm text-muted-foreground space-y-0.5">
            {address.fullName && <p>{address.fullName}</p>}
            {address.phone && <p>{address.phone}</p>}
            {address.landmark && <p>{address.landmark}</p>}
            {[address.city, address.region].filter(Boolean).join(", ") && (
              <p>{[address.city, address.region].filter(Boolean).join(", ")}</p>
            )}
          </address>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Placed on {formatDate(order.created_at)}
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button className="rounded-none" render={<Link href="/category/phones" />}>
          Continue shopping
        </Button>
        <Button variant="outline" className="rounded-none" render={<Link href="/account" />}>
          View my account
        </Button>
      </div>
    </div>
  );
}
