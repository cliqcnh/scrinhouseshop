"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Printer, ShieldCheck, CheckCircle2, Share2, Copy, Check, ExternalLink, Wrench, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "@/lib/qrcode";
import { formatPrice, formatDate } from "@/utils/format";
import type { Receipt } from "@/types/receipt";

interface ReceiptTemplateProps {
  receipt: Receipt;
  showActions?: boolean;
}

export function ReceiptTemplate({ receipt, showActions = true }: ReceiptTemplateProps) {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://scrinhouse.com";

  const verificationUrl = `${siteUrl}/verify/receipt/${receipt.receiptNumber}`;

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    toast.success("Verification link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsAppShare() {
    const message = `Hello ${receipt.customerName}, here is your official scrinhouse receipt for ${
      receipt.deviceModel ? receipt.deviceModel : "your purchase"
    }: ${verificationUrl}`;
    const url = `https://wa.me/${receipt.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, "_blank");
  }

  const isRepair = receipt.receiptType === "repair";
  const balanceDue = Math.max(0, receipt.totalAmount - receipt.amountPaid);

  return (
    <div className="space-y-4">
      {/* Action Toolbar (hidden on print) */}
      {showActions && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Receipt Actions:
            </span>
            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="gap-1.5 font-semibold text-xs rounded-lg"
            >
              <Printer className="size-3.5" />
              Print Receipt
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 font-semibold text-xs rounded-lg"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Verification Link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 font-semibold text-xs rounded-lg"
            >
              <Share2 className="size-3.5 text-emerald-600" />
              WhatsApp Customer
            </Button>
          </div>

          <Link
            href={`/verify/receipt/${receipt.receiptNumber}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Public Verify View</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      )}

      {/* The Printable Receipt Document */}
      <div
        ref={printRef}
        id="printable-receipt"
        className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-6 sm:p-8 text-neutral-900 shadow-sm print:max-w-none print:border-none print:p-0 print:shadow-none"
      >
        {/* Receipt Header */}
        <div className="border-b border-neutral-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
                  scrinhouse
                </span>
                <sup className="text-[10px] font-bold uppercase text-neutral-500">GH</sup>
              </div>
              <p className="text-xs font-medium text-neutral-600 mt-0.5">
                Certified Phone Sales, Repairs & Protection
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Accra, Ghana &middot; <span className="font-mono">scrinhouse.com</span> &middot; Tel: 0208204749 / 0247114256
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="inline-block rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Official {isRepair ? "Repair Receipt" : "Sales Receipt"}
              </span>
              <p className="font-mono text-xs font-bold text-neutral-900 tracking-wider">
                #{receipt.receiptNumber}
              </p>
              <p className="text-[11px] text-neutral-500">
                {formatDate(receipt.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Device Meta Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-neutral-200 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Customer Details
            </span>
            <p className="font-bold text-neutral-900 text-sm">{receipt.customerName}</p>
            <p className="text-neutral-600 font-mono">{receipt.customerPhone}</p>
            {receipt.customerEmail && (
              <p className="text-neutral-500 truncate">{receipt.customerEmail}</p>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Service / Device Reference
            </span>
            {receipt.deviceModel ? (
              <div className="flex items-center sm:justify-end gap-1.5 font-bold text-neutral-900 text-sm">
                {isRepair ? <Wrench className="size-3.5 text-neutral-500" /> : <Smartphone className="size-3.5 text-neutral-500" />}
                <span>{receipt.deviceModel}</span>
              </div>
            ) : (
              <p className="font-bold text-neutral-900 text-sm">General Product Purchase</p>
            )}
            {receipt.imeiSerial && (
              <p className="text-neutral-500 font-mono text-[11px]">
                IMEI/SN: {receipt.imeiSerial}
              </p>
            )}
            <p className="text-neutral-500 text-[11px]">
              Payment Method: <span className="font-semibold uppercase text-neutral-700">{receipt.paymentMethod.replace("_", " ")}</span>
            </p>
          </div>
        </div>

        {/* Itemized Table Breakdown */}
        <div className="py-5 border-b border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="pb-2.5">Description & Service Breakdown</th>
                <th className="pb-2.5 text-center w-12">Qty</th>
                <th className="pb-2.5 text-right w-24">Unit Price</th>
                <th className="pb-2.5 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {receipt.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">{item.description}</span>
                      {item.itemType === "repair_part" && (
                        <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Part / Screen
                        </span>
                      )}
                      {item.itemType === "workmanship" && (
                        <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Workmanship
                        </span>
                      )}
                      {item.itemType === "product" && (
                        <span className="rounded bg-neutral-100 text-neutral-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Product
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center text-neutral-600 font-medium">{item.quantity}</td>
                  <td className="py-3 text-right text-neutral-600 font-mono">{formatPrice(item.unitPrice)}</td>
                  <td className="py-3 text-right font-bold text-neutral-900 font-mono">{formatPrice(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal & Financial Breakdown */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col items-end text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-neutral-500">
              <span>Subtotal:</span>
              <span className="font-mono text-neutral-900">{formatPrice(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between w-64 text-neutral-500">
                <span>Discount:</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  -{formatPrice(receipt.discount)}
                </span>
              </div>
            )}
            {receipt.tax > 0 && (
              <div className="flex justify-between w-64 text-neutral-500">
                <span>Tax:</span>
                <span className="font-mono text-neutral-900">{formatPrice(receipt.tax)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 text-sm font-bold text-neutral-900 border-t border-neutral-200 pt-2">
              <span>Total Amount:</span>
              <span className="font-mono text-base">{formatPrice(receipt.totalAmount)}</span>
            </div>
            <div className="flex justify-between w-64 text-xs font-semibold text-neutral-700">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatPrice(receipt.amountPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between w-64 text-xs font-bold text-rose-600">
                <span>Balance Remaining:</span>
                <span className="font-mono">{formatPrice(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Highlighted Warranty Section (User Explicit Requirement) */}
        <div className="my-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <ShieldCheck className="size-4" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Warranty Coverage: {receipt.warrantyDuration} Non-Damage Warranty
                </h4>
                {receipt.warrantyExpiryDate && (
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Valid until {formatDate(receipt.warrantyExpiryDate)}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-600">
                {receipt.warrantyTerms}
              </p>
            </div>
          </div>
        </div>

        {/* QR Code & Verification Banner */}
        <div className="mt-5 pt-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-24 shrink-0 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-sm">
              <QRCodeSVG value={verificationUrl} size={84} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>Scan to Verify Authenticity</span>
              </div>
              <p className="text-[11px] text-neutral-500 max-w-xs leading-relaxed">
                Scan with any smartphone camera to view and verify this official receipt and warranty status online.
              </p>
              <p className="text-[10px] font-mono text-neutral-400 truncate max-w-xs">
                {verificationUrl}
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right text-[11px] text-neutral-400">
            <p>Issued by: {receipt.issuedByName || "scrinhouse Staff"}</p>
            <p className="mt-0.5">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
