import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { listAdminCoupons } from "@/actions/admin/coupons";
import { CouponManagerClient } from "./coupon-manager-client";

export const metadata: Metadata = {
  title: "Promo Coupons - Admin",
};

export default async function AdminCouponsPage() {
  const items = await listAdminCoupons();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Ticket className="size-6 text-foreground" /> Discount Promo Codes &amp; Coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create percentage or fixed-amount discount codes for storefront checkout.
          </p>
        </div>
      </div>

      <CouponManagerClient initialItems={items} />
    </div>
  );
}
