"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatPrice } from "@/utils/format";
import { saveRepairEstimate, deleteRepairEstimate, type RepairBookingRow } from "@/actions/admin/repairs";
import type { RepairEstimateItem } from "@/actions/storefront/repairs";

const SERVICE_TYPES = [
  "Screen Replacement",
  "Battery Replacement",
  "Charging Port Repair",
  "Liquid Damage Diagnosis",
  "Other Repair"
];

interface Props {
  initialBookings: RepairBookingRow[];
  initialEstimates: RepairEstimateItem[];
}

export function RepairsManagerClient({ initialBookings, initialEstimates }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bookings" | "estimates">("bookings");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<RepairEstimateItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Estimate form states
  const [deviceModel, setDeviceModel] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [price, setPrice] = useState("");

  function openCreate() {
    setEditingEstimate(null);
    setDeviceModel("");
    setServiceType(SERVICE_TYPES[0]);
    setPrice("");
    setDialogOpen(true);
  }

  function openEdit(est: RepairEstimateItem) {
    setEditingEstimate(est);
    setDeviceModel(est.deviceModel);
    setServiceType(est.serviceType);
    setPrice(est.price.toString());
    setDialogOpen(true);
  }

  async function handleEstimateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const priceNum = Number(price);
    if (!deviceModel || isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please provide a valid model and positive price.");
      setLoading(false);
      return;
    }

    const payload = {
      id: editingEstimate?.id,
      deviceModel,
      serviceType,
      price: priceNum,
    };

    const result = await saveRepairEstimate(payload);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save estimate.");
    } else {
      toast.success(editingEstimate ? "Estimate updated." : "Estimate created.");
      setDialogOpen(false);
      router.refresh();
    }
  }

  async function handleEstimateDelete(id: string) {
    if (!confirm("Are you sure you want to delete this price estimate?")) return;
    const result = await deleteRepairEstimate(id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete estimate.");
    } else {
      toast.success("Estimate deleted.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Repairs Manager</h1>
          <p className="text-sm text-muted-foreground">Manage service bookings and edit custom repair pricing.</p>
        </div>
        {activeTab === "estimates" && (
          <Button onClick={openCreate} className="gap-1.5 rounded-none shrink-0">
            <Plus className="size-4" /> Add Estimate
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border text-sm font-semibold">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-2 transition-colors ${
            activeTab === "bookings"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Bookings ({initialBookings.length})
        </button>
        <button
          onClick={() => setActiveTab("estimates")}
          className={`pb-2 transition-colors ${
            activeTab === "estimates"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Seeded Estimates ({initialEstimates.length})
        </button>
      </div>

      {/* Estimate Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEstimate ? "Edit Estimate" : "Create Estimate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEstimateSubmit} className="space-y-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="est-model">Phone Model *</Label>
              <Input
                id="est-model"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-service">Service Issue *</Label>
              <select
                id="est-service"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-price">Estimate Price (GHS) *</Label>
              <Input
                id="est-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1200"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-none mt-2">
              {loading ? "Saving..." : editingEstimate ? "Save changes" : "Create estimate"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* TABS CONTENT */}
      {activeTab === "bookings" && (
        <>
          {initialBookings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background">
              <Wrench className="size-10 text-muted-foreground/30" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">No repair bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border bg-background rounded">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th className="px-4 py-3">Booking ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Device / Issue</th>
                    <th className="px-4 py-3">Estimated Cost</th>
                    <th className="px-4 py-3">Date Booked</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3.5 font-mono text-xs text-foreground font-semibold">
                        #{b.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">{b.customerName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{b.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">{b.deviceModel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.serviceType}</p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        {formatPrice(b.estimatedAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          b.status === "completed" || b.status === "delivered"
                            ? "bg-green-500/10 text-green-700"
                            : b.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-yellow-500/10 text-yellow-700"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/admin/repairs/${b.id}`}
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
        </>
      )}

      {activeTab === "estimates" && (
        <>
          {initialEstimates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-border bg-background">
              <ShieldAlert className="size-10 text-muted-foreground/30" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">No active estimates registered in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border bg-background rounded">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th className="px-4 py-3">Phone Model</th>
                    <th className="px-4 py-3">Fix Type</th>
                    <th className="px-4 py-3">Estimate Price</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialEstimates.map((est) => (
                    <tr key={est.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3.5 font-semibold text-foreground">{est.deviceModel}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{est.serviceType}</td>
                      <td className="px-4 py-3.5 font-mono text-foreground font-semibold">
                        {formatPrice(est.price)}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEdit(est)}
                          className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1"
                        >
                          <Pencil className="size-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleEstimateDelete(est.id)}
                          className="text-xs text-muted-foreground hover:text-destructive font-semibold inline-flex items-center gap-1"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
