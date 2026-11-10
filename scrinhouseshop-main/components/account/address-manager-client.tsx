"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAddress, deleteAddress, setDefaultAddress, type AddressValues } from "@/actions/storefront/addresses";

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Western",
  "Eastern",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North"
];

export function AddressManagerClient({ initialAddresses }: { initialAddresses: AddressValues[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AddressValues | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [region, setRegion]     = useState(GHANA_REGIONS[0]);
  const [city, setCity]         = useState("");
  const [landmark, setLandmark] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  function openCreate() {
    setEditing(null);
    setFullName("");
    setPhone("");
    setRegion(GHANA_REGIONS[0]);
    setCity("");
    setLandmark("");
    setIsDefault(initialAddresses.length === 0); // auto default if first address
    setOpen(true);
  }

  function openEdit(addr: AddressValues) {
    setEditing(addr);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setRegion(addr.region);
    setCity(addr.city);
    setLandmark(addr.landmark ?? "");
    setIsDefault(addr.isDefault);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!fullName || !phone || !region || !city) {
      toast.error("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    const payload: AddressValues = {
      id: editing?.id,
      fullName,
      phone,
      region,
      city,
      landmark: landmark || null,
      isDefault: isDefault,
    };

    const result = await saveAddress(payload);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to save address.");
    } else {
      toast.success(editing ? "Address updated." : "Address added.");
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    const result = await deleteAddress(id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete address.");
    } else {
      toast.success("Address deleted.");
      router.refresh();
    }
  }

  async function handleSetDefault(id: string) {
    const result = await setDefaultAddress(id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update default address.");
    } else {
      toast.success("Default address updated.");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-1.5 rounded-none">
          <Plus className="size-4" /> Add Address
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "New delivery address"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="addr-name">Full Name *</Label>
              <Input
                id="addr-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Receiver's name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr-phone">Phone Number *</Label>
              <Input
                id="addr-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 054XXXXXXX"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr-region">Region *</Label>
                <select
                  id="addr-region"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r} className="bg-background text-foreground">{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr-city">City / Neighbourhood *</Label>
                <Input
                  id="addr-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. East Legon"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addr-landmark">Landmark (Optional)</Label>
              <Input
                id="addr-landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near ANC Mall"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(v) => setIsDefault(v === true)}
                id="addr-default"
                disabled={editing?.isDefault} // default cannot be unchecked directly
              />
              <Label htmlFor="addr-default" className="cursor-pointer">Set as default address</Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-none mt-2">
              {loading ? "Saving..." : editing ? "Save changes" : "Add address"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {initialAddresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center border border-border">
          <MapPin className="size-9 text-muted-foreground/30" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">You don&apos;t have any saved addresses yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {initialAddresses.map((addr) => (
            <div key={addr.id} className="relative flex flex-col justify-between border border-border p-5 bg-background">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{addr.fullName}</p>
                  {addr.isDefault && (
                    <span className="inline-flex items-center bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase text-background">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>{addr.phone}</p>
                  <p>{addr.city}, {addr.region} Region</p>
                  {addr.landmark && <p className="text-xs italic">Landmark: {addr.landmark}</p>}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                {!addr.isDefault ? (
                  <button
                    type="button"
                    onClick={() => addr.id && handleSetDefault(addr.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Set as default
                  </button>
                ) : (
                  <span className="text-muted-foreground select-none">Primary address</span>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(addr)}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    aria-label="Edit address"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => addr.id && handleDelete(addr.id)}
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    aria-label="Delete address"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
