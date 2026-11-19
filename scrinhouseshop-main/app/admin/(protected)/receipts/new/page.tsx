import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReceiptGeneratorClient } from "@/components/admin/receipt-generator-client";

export const metadata: Metadata = {
  title: "Generate Customer Receipt | ScrinHouse Admin",
};

export default function NewReceiptPage() {
  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/receipts"
          className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Generate Customer Receipt
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create an official receipt with itemized repair parts, workmanship fees, and scannable QR verification.
          </p>
        </div>
      </div>

      {/* Interactive Generator Form & Live Preview */}
      <ReceiptGeneratorClient />
    </div>
  );
}
