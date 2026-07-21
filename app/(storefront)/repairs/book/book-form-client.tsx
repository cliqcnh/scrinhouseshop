"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import Link from "next/link";
import { Wrench, CheckCircle2, ChevronRight, ChevronLeft, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/utils/format";
import { createRepairBooking, type RepairEstimateItem, type RepairBookingValues } from "@/actions/storefront/repairs";
import type { AddressValues } from "@/actions/storefront/addresses";

const SERVICE_TYPES = [
  "Screen Replacement",
  "Battery Replacement",
  "Charging Port Repair",
  "Liquid Damage Diagnosis",
  "Other Repair"
];

const PREDEFINED_MODELS = [
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 13 Pro Max",
  "iPhone 13",
  "iPhone 12",
  "iPhone 11",
  "Other Model"
];

const DIAGNOSTIC_FEE = 150;

interface Props {
  estimates: RepairEstimateItem[];
  defaultName: string;
  defaultPhone: string;
  defaultEmail: string;
  savedAddresses: AddressValues[];
}

export function BookRepairFormClient({ estimates, defaultName, defaultPhone, defaultEmail, savedAddresses }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Step 1: Device & Service
  const [deviceModel, setDeviceModel] = useState(PREDEFINED_MODELS[0]);
  const [customDeviceModel, setCustomDeviceModel] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [customServiceType, setCustomServiceType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  // Step 2: Customer details
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerPhone, setCustomerPhone] = useState(defaultPhone);
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup_delivery" | "walk_in">("pickup_delivery");

  // Pickup address fields (if delivery)
  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [addrName, setAddrName] = useState(defaultAddress?.fullName ?? defaultName);
  const [addrPhone, setAddrPhone] = useState(defaultAddress?.phone ?? defaultPhone);
  const [addrRegion, setAddrRegion] = useState(defaultAddress?.region ?? "Greater Accra");
  const [addrCity, setAddrCity] = useState(defaultAddress?.city ?? "");
  const [addrLandmark, setAddrLandmark] = useState(defaultAddress?.landmark ?? "");

  // Resolve active device model name
  const activeModel = deviceModel === "Other Model" ? customDeviceModel : deviceModel;
  const activeService = serviceType === "Other Repair" ? customServiceType : serviceType;

  // Calculate dynamic estimate set by admin
  const estimate = useMemo(() => {
    if (deviceModel === "Other Model" || serviceType === "Other Repair") {
      return { price: DIAGNOSTIC_FEE, isCustom: true };
    }
    const matched = estimates.find(
      (e) => e.deviceModel === deviceModel && e.serviceType === serviceType
    );
    if (matched) {
      return { price: matched.price, isCustom: false };
    }
    // Fallback diagnostic fee
    return { price: DIAGNOSTIC_FEE, isCustom: true };
  }, [deviceModel, serviceType, estimates]);

  function handleAddressSelectChange(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setAddrName(defaultName);
      setAddrPhone(defaultPhone);
      setAddrRegion("Greater Accra");
      setAddrCity("");
      setAddrLandmark("");
    } else {
      const selected = savedAddresses.find((a) => a.id === id);
      if (selected) {
        setAddrName(selected.fullName);
        setAddrPhone(selected.phone);
        setAddrRegion(selected.region);
        setAddrCity(selected.city);
        setAddrLandmark(selected.landmark ?? "");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!customerName || !customerPhone || !customerEmail || !activeModel || !activeService) {
      toast.error("Please fill in all customer details.");
      setLoading(false);
      return;
    }

    let pickupAddress = null;
    if (deliveryMethod === "pickup_delivery") {
      if (!addrName || !addrPhone || !addrRegion || !addrCity) {
        toast.error("Please fill in your pickup delivery address.");
        setLoading(false);
        return;
      }
      pickupAddress = {
        fullName: addrName,
        phone: addrPhone,
        region: addrRegion,
        city: addrCity,
        landmark: addrLandmark || null,
      };
    }

    const payload: RepairBookingValues = {
      customerName,
      customerPhone,
      customerEmail,
      deviceModel: activeModel,
      serviceType: activeService,
      issueDescription,
      estimatedAmount: estimate.price,
      deliveryMethod,
      pickupAddress,
    };

    const result = await createRepairBooking(payload);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to book your repair.");
    } else {
      toast.success("Repair booked successfully!");
      setBookingId(result.bookingId ?? null);
      setStep(3);
    }
  }

  const inputCls =
    "w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground";

  // SUCCESS STEP
  if (step === 3) {
    return (
      <div className="border border-border p-8 text-center space-y-6 bg-background">
        <CheckCircle2 className="size-12 mx-auto text-green-600" />
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground">Repair Request Submitted!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your booking has been successfully recorded. We have sent a confirmation email to <span className="font-medium text-foreground">{customerEmail}</span>.
          </p>
        </div>

        <div className="border-t border-b border-border py-4 my-2 max-w-sm mx-auto bg-muted/10 text-sm">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Booking Tracking ID</p>
          <p className="font-mono text-base font-bold text-foreground mt-1 select-all">{bookingId}</p>
        </div>

        <div className="text-xs text-left max-w-md mx-auto space-y-2 text-muted-foreground bg-muted/20 p-4 border border-border">
          <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">What happens next?</p>
          <ul className="list-decimal pl-4 space-y-1.5 leading-relaxed">
            {deliveryMethod === "pickup_delivery" ? (
              <li>Our dispatch rider will contact you to schedule the device pick up.</li>
            ) : (
              <li>You can drop off your device at our physical store during working hours (9 AM - 6 PM).</li>
            )}
            <li>Technicians will diagnose the device and confirm the final quotation before initiating the repair.</li>
            <li>You can check active status by inputting the Tracking ID on our <Link href="/track" className="underline font-medium text-foreground">Track Order</Link> page.</li>
          </ul>
        </div>

        <div className="pt-2 flex justify-center gap-4">
          <Button variant="outline" className="rounded-none border-border" render={<Link href="/" />}>
            Back to Home
          </Button>
          <Button className="rounded-none" render={<Link href={`/track?ref=${bookingId}`} />}>
            Track Repair Progress
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-background p-6 sm:p-8 space-y-6">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-lg font-bold text-foreground">Book a Phone Repair</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ScrinHouse premium mobile workshop</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase bg-[#f5f5f5] px-2.5 py-1">
          Step {step} of 2
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: DEVICE & SERVICE INFO */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select device model */}
              <div className="space-y-1.5">
                <Label htmlFor="rep-model" className={labelCls}>Phone Model *</Label>
                <select
                  id="rep-model"
                  className={inputCls}
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                >
                  {PREDEFINED_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Select repair service type */}
              <div className="space-y-1.5">
                <Label htmlFor="rep-service" className={labelCls}>Issue / Service *</Label>
                <select
                  id="rep-service"
                  className={inputCls}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Model fields if "Other Model" selected */}
            {deviceModel === "Other Model" && (
              <div className="space-y-1.5">
                <Label htmlFor="rep-custom-model" className={labelCls}>Enter Custom Model Name *</Label>
                <Input
                  id="rep-custom-model"
                  value={customDeviceModel}
                  onChange={(e) => setCustomDeviceModel(e.target.value)}
                  placeholder="e.g. Samsung Galaxy S24 Ultra, Pixel 8 Pro"
                  required
                />
              </div>
            )}

            {/* Custom Service type field if "Other Repair" selected */}
            {serviceType === "Other Repair" && (
              <div className="space-y-1.5">
                <Label htmlFor="rep-custom-service" className={labelCls}>Enter Repair Service Required *</Label>
                <Input
                  id="rep-custom-service"
                  value={customServiceType}
                  onChange={(e) => setCustomServiceType(e.target.value)}
                  placeholder="e.g. Back glass swap, camera replacement"
                  required
                />
              </div>
            )}

            {/* Price Estimate Display Banner */}
            <div className="border border-border p-5 bg-[#f9f9f9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estimated Repair Cost</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {formatPrice(estimate.price)}
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground leading-normal max-w-xs sm:text-right">
                {estimate.isCustom ? (
                  <span>Cost to be verified after physical diagnostic. GHS 150 diagnostic fee applies.</span>
                ) : (
                  <span>Upfront estimate based on standard workshop pricing. Parts and labor included.</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="rep-desc" className={labelCls}>Issue Description *</Label>
              <textarea
                id="rep-desc"
                rows={4}
                className={`${inputCls} py-2`}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Explain the issue (e.g. Screen is showing white lines after drops, water damage, port is loose)"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => {
                  if (deviceModel === "Other Model" && !customDeviceModel) {
                    toast.error("Please enter your custom phone model.");
                    return;
                  }
                  if (serviceType === "Other Repair" && !customServiceType) {
                    toast.error("Please enter the repair type required.");
                    return;
                  }
                  if (!issueDescription) {
                    toast.error("Please enter a description of the issue.");
                    return;
                  }
                  setStep(2);
                }}
                className="gap-1.5 rounded-none px-6"
              >
                Next Step <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CUSTOMER INFO & DELIVERY */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-4 border-b border-border pb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Contact details</h2>
              
              <div className="space-y-1.5">
                <Label htmlFor="rep-name" className={labelCls}>Full Name *</Label>
                <Input
                  id="rep-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Kofi Mensah"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rep-phone" className={labelCls}>Phone Number *</Label>
                  <Input
                    id="rep-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 054XXXXXXX"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rep-email" className={labelCls}>Email Address *</Label>
                  <Input
                    id="rep-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery / Service Method</h2>
              
              <div className="space-y-1.5">
                <Label htmlFor="rep-method" className={labelCls}>Service Method *</Label>
                <select
                  id="rep-method"
                  className={inputCls}
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value as any)}
                >
                  <option value="pickup_delivery">Doorstep Pickup & Delivery</option>
                  <option value="walk_in">Walk-in Drop-off</option>
                </select>
              </div>

              {/* Delivery Pickup fields */}
              {deliveryMethod === "pickup_delivery" && (
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Pickup Location</h3>
                  </div>

                  {savedAddresses.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rep-saved-addr" className={labelCls}>Select Saved Address</Label>
                      <select
                        id="rep-saved-addr"
                        value={selectedAddressId}
                        onChange={(e) => handleAddressSelectChange(e.target.value)}
                        className={inputCls}
                      >
                        <option value="new">-- Enter custom pickup address --</option>
                        {savedAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.fullName} - {addr.phone} ({addr.city}, {addr.region} Region)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="rep-addr-name" className={labelCls}>Contact Person at Pickup *</Label>
                      <Input
                        id="rep-addr-name"
                        value={addrName}
                        onChange={(e) => setAddrName(e.target.value)}
                        placeholder="Receiver/sender name"
                        required={deliveryMethod === "pickup_delivery"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rep-addr-phone" className={labelCls}>Contact Phone *</Label>
                      <Input
                        id="rep-addr-phone"
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        placeholder="Contact phone"
                        required={deliveryMethod === "pickup_delivery"}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rep-addr-region" className={labelCls}>Region *</Label>
                        <select
                          id="rep-addr-region"
                          className={inputCls}
                          value={addrRegion}
                          onChange={(e) => setAddrRegion(e.target.value)}
                        >
                          <option value="Greater Accra">Greater Accra</option>
                          <option value="Ashanti">Ashanti</option>
                          <option value="Central">Central</option>
                          <option value="Western">Western</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rep-addr-city" className={labelCls}>City / Neighbourhood *</Label>
                        <Input
                          id="rep-addr-city"
                          value={addrCity}
                          onChange={(e) => setAddrCity(e.target.value)}
                          placeholder="e.g. East Legon"
                          required={deliveryMethod === "pickup_delivery"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="rep-addr-landmark" className={labelCls}>Landmark / Street (Optional)</Label>
                      <Input
                        id="rep-addr-landmark"
                        value={addrLandmark}
                        onChange={(e) => setAddrLandmark(e.target.value)}
                        placeholder="e.g. Near ANC Mall, opposite total station"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5 rounded-none"
              >
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="gap-1.5 rounded-none px-6"
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
