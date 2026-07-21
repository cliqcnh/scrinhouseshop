"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Wrench, ShieldAlert, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRepairBooking } from "@/actions/admin/repairs";
import { formatDate, formatPrice } from "@/utils/format";

interface BookingDetails {
  id: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deviceModel: string;
  serviceType: string;
  issueDescription: string;
  estimatedAmount: number;
  status: string;
  deliveryMethod: string;
  pickupAddress: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    landmark?: string | null;
  } | null;
  createdAt: string;
}

export function RepairDetailsClient({ booking }: { booking: BookingDetails }) {
  const router = useRouter();
  const [status, setStatus] = useState(booking.status);
  const [amount, setAmount] = useState(booking.estimatedAmount.toString());
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const priceNum = Number(amount);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price.");
      setLoading(false);
      return;
    }

    const result = await updateRepairBooking(booking.id, {
      status,
      estimatedAmount: priceNum,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to update booking.");
    } else {
      toast.success("Repair details updated successfully!");
      router.refresh();
    }
  }

  const labelCls = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <button
          onClick={() => router.push("/admin/repairs")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to repairs
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="font-heading text-xl font-bold text-foreground">
          Repair Booking #{booking.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Date Booked: {formatDate(booking.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left main info */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdate} className="border border-border p-5 bg-background space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Manage Repair Status</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rep-status">Repair Status</Label>
                <select
                  id="rep-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="repairing">Repairing</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rep-cost">Cost Estimate (GHS)</Label>
                <Input
                  id="rep-cost"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Cost estimate"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="rounded-none px-6">
                {loading ? "Saving..." : "Save updates"}
              </Button>
            </div>
          </form>

          {/* Details */}
          <section className="border border-border p-5 bg-background space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Device & Issue</h2>
            <div className="text-sm space-y-2">
              <div>
                <p className={labelCls}>Device Model</p>
                <p className="font-semibold text-foreground mt-0.5">{booking.deviceModel}</p>
              </div>
              <div>
                <p className={labelCls}>Service Needed</p>
                <p className="font-semibold text-foreground mt-0.5">{booking.serviceType}</p>
              </div>
              <div>
                <p className={labelCls}>Customer Description</p>
                <p className="text-muted-foreground whitespace-pre-line mt-1 bg-muted/20 p-3 rounded border border-border text-xs leading-relaxed">
                  {booking.issueDescription}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right column details */}
        <div className="space-y-6">
          <section className="border border-border p-5 space-y-3 bg-background">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Customer Info</h2>
            <div className="text-xs space-y-2">
              <div>
                <p className={labelCls}>Name</p>
                <p className="text-foreground font-semibold mt-0.5">{booking.customerName}</p>
              </div>
              <div>
                <p className={labelCls}>Email</p>
                <p className="text-foreground font-medium mt-0.5 truncate">{booking.customerEmail}</p>
              </div>
              <div>
                <p className={labelCls}>Phone</p>
                <p className="text-foreground font-medium mt-0.5">{booking.customerPhone}</p>
              </div>
            </div>
          </section>

          <section className="border border-border p-5 space-y-3 bg-background">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Service Delivery</h2>
            </div>
            <div className="text-xs space-y-2">
              <div>
                <p className={labelCls}>Method</p>
                <p className="text-foreground font-semibold mt-0.5 capitalize">
                  {booking.deliveryMethod.replace(/_/g, " ")}
                </p>
              </div>
              {booking.deliveryMethod === "pickup_delivery" && booking.pickupAddress ? (
                <div className="border-t border-border pt-3 mt-3 space-y-2">
                  <div>
                    <p className={labelCls}>Pickup Name</p>
                    <p className="text-foreground font-medium mt-0.5">{booking.pickupAddress.fullName}</p>
                  </div>
                  <div>
                    <p className={labelCls}>Pickup Phone</p>
                    <p className="text-foreground font-medium mt-0.5">{booking.pickupAddress.phone}</p>
                  </div>
                  <div>
                    <p className={labelCls}>City / Region</p>
                    <p className="text-foreground font-medium mt-0.5">
                      {booking.pickupAddress.city}, {booking.pickupAddress.region} Region
                    </p>
                  </div>
                  {booking.pickupAddress.landmark && (
                    <div>
                      <p className={labelCls}>Landmark</p>
                      <p className="text-foreground font-medium mt-0.5 italic">{booking.pickupAddress.landmark}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
