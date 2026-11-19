"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  ShoppingBag,
  Plus,
  Trash2,
  ShieldCheck,
  CreditCard,
  User,
  Smartphone,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptTemplate } from "@/components/admin/receipt-template";
import { createAdminReceipt } from "@/actions/admin/receipts";
import type { ReceiptType, PaymentMethod, PaymentStatus, ReceiptItemType, Receipt } from "@/types/receipt";

const DEFAULT_WARRANTY_TERMS =
  "All items and repairs have a 1-week non-damage warranty. Warranty covers manufacturer defects and workmanship only. Physical screen damage, cracks, water damage, or unauthorized tampering void the warranty.";

const WARRANTY_PRESETS = [
  "1 Week",
  "2 Weeks",
  "1 Month",
  "3 Months",
  "6 Months",
  "1 Year",
  "No Warranty",
];

interface FormItem {
  id: string;
  itemType: ReceiptItemType;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function ReceiptGeneratorClient() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [activeMode, setActiveMode] = useState<ReceiptType>("repair");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Device / Reference (for repairs & serialized items)
  const [deviceModel, setDeviceModel] = useState("");
  const [imeiSerial, setImeiSerial] = useState("");

  // Line items
  const [items, setItems] = useState<FormItem[]>([
    {
      id: "item-1",
      itemType: "repair_part",
      description: "Screen Replacement Part",
      quantity: 1,
      unitPrice: 0,
    },
    {
      id: "item-2",
      itemType: "workmanship",
      description: "Technician Workmanship & Screen Installation",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  // Financial details
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [amountPaidCustom, setAmountPaidCustom] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Warranty details (Editable as requested)
  const [warrantyDuration, setWarrantyDuration] = useState("1 Week");
  const [warrantyTerms, setWarrantyTerms] = useState(DEFAULT_WARRANTY_TERMS);

  // Mobile preview drawer toggle
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Mode Switch Handlers
  function switchMode(mode: ReceiptType) {
    setActiveMode(mode);
    if (mode === "repair") {
      setItems([
        {
          id: "item-1",
          itemType: "repair_part",
          description: deviceModel ? `${deviceModel} Screen Replacement` : "Screen Replacement Part",
          quantity: 1,
          unitPrice: 0,
        },
        {
          id: "item-2",
          itemType: "workmanship",
          description: "Technician Workmanship & Screen Installation",
          quantity: 1,
          unitPrice: 0,
        },
      ]);
      setWarrantyDuration("1 Week");
    } else if (mode === "sale") {
      setItems([
        {
          id: "item-1",
          itemType: "product",
          description: "Smartphone / Device",
          quantity: 1,
          unitPrice: 0,
        },
      ]);
      setWarrantyDuration("1 Week");
    } else {
      setItems([
        {
          id: "item-1",
          itemType: "service",
          description: "Service Fee",
          quantity: 1,
          unitPrice: 0,
        },
      ]);
    }
  }

  // Pre-fill repair screen & workmanship shortcut
  function addScreenAndWorkmanshipPreset() {
    const model = deviceModel.trim() || "Device";
    setItems((prev) => [
      ...prev,
      {
        id: `part-${Date.now()}`,
        itemType: "repair_part",
        description: `${model} Original Display Screen`,
        quantity: 1,
        unitPrice: 0,
      },
      {
        id: `work-${Date.now() + 1}`,
        itemType: "workmanship",
        description: "Screen Fitting & Workmanship Fee",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
    toast.success("Added Screen and Workmanship rows to receipt");
  }

  // Item management
  function addItem(type: ReceiptItemType = "repair_part") {
    let defaultDesc = "Part Replacement";
    if (type === "workmanship") defaultDesc = "Technician Workmanship Fee";
    else if (type === "product") defaultDesc = "Product Item";
    else if (type === "accessory") defaultDesc = "Accessory / Case";

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        itemType: type,
        description: defaultDesc,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function updateItem(id: string, field: keyof FormItem, val: any) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: val };
        }
        return it;
      })
    );
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      toast.error("Receipt must have at least one line item.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0) + (Number(tax) || 0));
  }, [subtotal, discount, tax]);

  const effectiveAmountPaid = useMemo(() => {
    if (amountPaidCustom !== "") {
      return Number(amountPaidCustom) || 0;
    }
    return paymentStatus === "paid" ? totalAmount : 0;
  }, [amountPaidCustom, paymentStatus, totalAmount]);

  // Build live receipt object for preview
  const liveReceipt: Receipt = useMemo(() => {
    const now = new Date();
    return {
      id: "preview",
      receiptNumber: "REC-PREVIEW",
      receiptType: activeMode,
      customerName: customerName.trim() || "Customer Name",
      customerPhone: customerPhone.trim() || "050-000-0000",
      customerEmail: customerEmail.trim() || null,
      deviceModel: deviceModel.trim() || null,
      imeiSerial: imeiSerial.trim() || null,
      items: items.map((it) => ({
        id: it.id,
        itemType: it.itemType,
        description: it.description || "Item",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      })),
      subtotal,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      totalAmount,
      amountPaid: effectiveAmountPaid,
      paymentMethod,
      paymentStatus,
      warrantyDuration,
      warrantyTerms,
      warrantyExpiryDate:
        warrantyDuration.toLowerCase().includes("none")
          ? null
          : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: notes.trim() || null,
      issuedByName: "ScrinHouse Admin",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }, [
    activeMode,
    customerName,
    customerPhone,
    customerEmail,
    deviceModel,
    imeiSerial,
    items,
    subtotal,
    discount,
    tax,
    totalAmount,
    effectiveAmountPaid,
    paymentMethod,
    paymentStatus,
    warrantyDuration,
    warrantyTerms,
    notes,
  ]);

  // Submission handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Please enter the customer's full name.");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter the customer's phone number.");
      return;
    }
    if (items.some((it) => !it.description.trim() || it.unitPrice <= 0)) {
      toast.error("Please ensure all line items have a valid description and price greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminReceipt({
        receiptType: activeMode,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        deviceModel: deviceModel || undefined,
        imeiSerial: imeiSerial || undefined,
        items: items.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        })),
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        amountPaid: effectiveAmountPaid,
        paymentMethod,
        paymentStatus,
        warrantyDuration,
        warrantyTerms,
        notes: notes || undefined,
      });

      if (!res.success || !res.id) {
        toast.error(res.error ?? "Failed to create receipt");
        return;
      }

      toast.success(`Receipt #${res.receiptNumber} generated successfully!`);
      router.push(`/admin/receipts/${res.id}`);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred while generating receipt.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: The Generator Form (lg:col-span-7) */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
        {/* Mode Selector */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Receipt Mode:
            </span>
            <span className="text-xs text-muted-foreground">Select type of transaction</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => switchMode("repair")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                activeMode === "repair"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Wrench className="size-4" />
              <span>Device Repair</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode("sale")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                activeMode === "sale"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ShoppingBag className="size-4" />
              <span>Product Sale</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode("custom")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                activeMode === "custom"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Sparkles className="size-4" />
              <span>Custom Service</span>
            </button>
          </div>
        </div>

        {/* Customer Information */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Customer Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="custName" className="text-xs font-semibold text-foreground">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custName"
                placeholder="e.g. Kwame Mensah"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="rounded-lg text-sm border-border"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="custPhone" className="text-xs font-semibold text-foreground">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custPhone"
                placeholder="e.g. 054 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="rounded-lg text-sm border-border"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="custEmail" className="text-xs font-semibold text-foreground">
                Email Address <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="custEmail"
                type="email"
                placeholder="e.g. kwame@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="rounded-lg text-sm border-border"
              />
            </div>
          </div>
        </section>

        {/* Device Information (For repairs or serialized devices) */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Device & Hardware Reference
              </h3>
            </div>
            {activeMode === "repair" && (
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Screen & Part Breakdown
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="devModel" className="text-xs font-semibold text-foreground">
                Device Model {activeMode === "repair" && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="devModel"
                placeholder="e.g. iPhone 14 Pro Max / Galaxy S24"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="rounded-lg text-sm border-border"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="devImei" className="text-xs font-semibold text-foreground">
                IMEI / Serial Number <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="devImei"
                placeholder="e.g. 356891234567890"
                value={imeiSerial}
                onChange={(e) => setImeiSerial(e.target.value)}
                className="rounded-lg text-sm font-mono border-border"
              />
            </div>
          </div>

          {activeMode === "repair" && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScreenAndWorkmanshipPreset}
                className="rounded-lg text-xs font-semibold border-dashed gap-1.5"
              >
                <Plus className="size-3.5" />
                Quick-Add Screen Replacement & Workmanship
              </Button>
            </div>
          )}
        </section>

        {/* Itemized Services & Amount Breakdown (Core Request) */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Itemized Breakdown
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Breakdown of screen/part price and workmanship labor fees.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem("repair_part")}
                className="text-[11px] rounded-lg h-7 font-semibold"
              >
                + Part / Screen
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem("workmanship")}
                className="text-[11px] rounded-lg h-7 font-semibold"
              >
                + Workmanship
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem("product")}
                className="text-[11px] rounded-lg h-7 font-semibold"
              >
                + Item
              </Button>
            </div>
          </div>

          {/* Line items list */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2.5 rounded-lg border border-border bg-muted/10 p-3 items-center"
              >
                {/* Item Type Selector */}
                <div className="col-span-12 sm:col-span-3">
                  <Select
                    value={item.itemType}
                    onValueChange={(val) => updateItem(item.id, "itemType", val as ReceiptItemType)}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-md border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repair_part">Part / Screen</SelectItem>
                      <SelectItem value="workmanship">Workmanship</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="accessory">Accessory</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="col-span-12 sm:col-span-4">
                  <Input
                    placeholder="Description (e.g. Screen Replacement)"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="h-8 text-xs rounded-md border-border bg-white"
                  />
                </div>

                {/* Qty */}
                <div className="col-span-3 sm:col-span-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-8 text-xs text-center rounded-md border-border bg-white"
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-6 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Price (GH₵)"
                    value={item.unitPrice === 0 ? "" : item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono text-right rounded-md border-border bg-white"
                  />
                </div>

                {/* Remove */}
                <div className="col-span-3 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotals & Discounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Discount (GH₵)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0.00"
                value={discount === 0 ? "" : discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs font-mono rounded-lg border-border"
              />
            </div>

            <div className="space-y-1 text-right sm:pt-4">
              <span className="text-xs text-muted-foreground block">Calculated Total</span>
              <span className="font-heading text-xl font-bold text-foreground">
                GH₵ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* Editable Warranty Terms (Core User Requirement) */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-emerald-600" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Warranty Configuration (Editable)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                All items and repairs have a 1-week non-damage warranty by default. Adjust duration as needed:
              </p>
            </div>
          </div>

          {/* Duration Preset Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Warranty Duration:
            </Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {WARRANTY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWarrantyDuration(preset)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                    warrantyDuration === preset
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              value={warrantyDuration}
              onChange={(e) => setWarrantyDuration(e.target.value)}
              placeholder="Or type custom duration (e.g. 10 Days, 3 Months)"
              className="h-8 text-xs rounded-lg border-border mt-2"
            />
          </div>

          {/* Editable Terms Text */}
          <div className="space-y-1.5">
            <Label htmlFor="wterms" className="text-xs font-semibold text-foreground">
              Warranty Terms on Receipt:
            </Label>
            <textarea
              id="wterms"
              rows={3}
              value={warrantyTerms}
              onChange={(e) => setWarrantyTerms(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </section>

        {/* Payment & Financial Settlement */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <CreditCard className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Payment Settlement
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="momo">MTN Mobile Money / MoMo</SelectItem>
                  <SelectItem value="card">Card / POS</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid in Full</SelectItem>
                  <SelectItem value="partial">Deposit / Partial</SelectItem>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Amount Paid (GH₵)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={totalAmount.toFixed(2)}
                value={amountPaidCustom}
                onChange={(e) => setAmountPaidCustom(e.target.value)}
                className="h-9 text-xs font-mono rounded-lg border-border"
              />
            </div>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="lg:hidden rounded-xl text-xs font-semibold gap-1.5"
          >
            <Eye className="size-3.5" />
            {showMobilePreview ? "Hide Preview" : "Preview Receipt"}
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="ml-auto rounded-xl text-xs font-bold uppercase tracking-wider px-6"
          >
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Generate & Issue Receipt
          </Button>
        </div>
      </form>

      {/* RIGHT COLUMN: Live Receipt Preview (lg:col-span-5) */}
      <div className={`lg:col-span-5 lg:sticky lg:top-6 ${showMobilePreview ? "block" : "hidden lg:block"}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="size-3.5" />
              Live Receipt Preview
            </span>
            <span className="text-[11px] text-muted-foreground">Updates as you type</span>
          </div>

          <div className="transform scale-[0.92] sm:scale-100 origin-top">
            <ReceiptTemplate receipt={liveReceipt} showActions={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
