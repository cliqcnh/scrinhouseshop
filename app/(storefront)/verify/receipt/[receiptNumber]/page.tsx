import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, AlertCircle, Wrench, Smartphone, MessageCircle, Phone, ArrowLeft } from "lucide-react";
import { getPublicReceiptVerification } from "@/actions/admin/receipts";
import { ReceiptTemplate } from "@/components/admin/receipt-template";
import { formatDate } from "@/utils/format";

interface Props {
  params: Promise<{ receiptNumber: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { receiptNumber } = await params;
  const result = await getPublicReceiptVerification(receiptNumber);

  if (!result || !result.receipt) {
    return { title: "Receipt Verification | ScrinHouse" };
  }

  return {
    title: `Verified Receipt #${result.receipt.receiptNumber} | ScrinHouse`,
    description: `Official verified receipt for ${result.receipt.customerName} - ${result.receipt.deviceModel ?? "ScrinHouse Store"}`,
  };
}

export default async function PublicReceiptVerificationPage({ params }: Props) {
  const { receiptNumber } = await params;
  const result = await getPublicReceiptVerification(receiptNumber);

  if (!result || !result.receipt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-7" />
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground">
          Receipt Not Found
        </h1>
        <p className="text-sm text-muted-foreground">
          The receipt reference <code className="font-mono font-bold text-foreground">#{receiptNumber}</code> could not be found in our official verification records.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline underline-offset-4"
          >
            <ArrowLeft className="size-3.5" />
            Back to ScrinHouse Home
          </Link>
        </div>
      </div>
    );
  }

  const { receipt, isWarrantyActive, warrantyDaysLeft } = result;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8 space-y-6">
      {/* Verification Trust Banner */}
      <div className="no-print rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-sm sm:text-base font-bold text-emerald-950">
                  Official Verified Receipt
                </h2>
                <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Authentic
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Issued by ScrinHouse Ghana &middot; Ref: <span className="font-mono font-bold">#{receipt.receiptNumber}</span>
              </p>
            </div>
          </div>

          {/* Warranty Status Pill */}
          <div className="shrink-0 sm:text-right">
            {isWarrantyActive ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>{receipt.warrantyDuration} Warranty Active ({warrantyDaysLeft}d left)</span>
              </div>
            ) : receipt.warrantyExpiryDate ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
                <ShieldCheck className="size-4 text-neutral-400" />
                <span>Warranty Expired on {formatDate(receipt.warrantyExpiryDate)}</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-neutral-500">No Warranty Assigned</span>
            )}
          </div>
        </div>

        {/* Customer Help Bar */}
        <div className="border-t border-emerald-200/60 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
          <span>Need help with your device or warranty claim?</span>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/233500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 underline"
            >
              <MessageCircle className="size-3.5" />
              <span>WhatsApp Support</span>
            </a>
            <span>&middot;</span>
            <a
              href="tel:+233500000000"
              className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 underline"
            >
              <Phone className="size-3.5" />
              <span>Call Us</span>
            </a>
          </div>
        </div>
      </div>

      {/* The Official Receipt Document */}
      <ReceiptTemplate receipt={receipt} showActions={true} />

      {/* Back Link */}
      <div className="no-print text-center pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to ScrinHouse Store</span>
        </Link>
      </div>
    </div>
  );
}
