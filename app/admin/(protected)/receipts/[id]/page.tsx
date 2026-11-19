import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminReceiptById } from "@/actions/admin/receipts";
import { ReceiptTemplate } from "@/components/admin/receipt-template";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const receipt = await getAdminReceiptById(id);
  if (!receipt) return { title: "Receipt Not Found" };
  return {
    title: `Receipt #${receipt.receiptNumber} | ScrinHouse Admin`,
  };
}

export default async function AdminReceiptDetailPage({ params }: Props) {
  const { id } = await params;
  const receipt = await getAdminReceiptById(id);

  if (!receipt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="no-print flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/receipts"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Receipt #{receipt.receiptNumber}
            </h1>
            <p className="text-xs text-muted-foreground">
              Issued for {receipt.customerName} &middot; {receipt.warrantyDuration} Non-Damage Warranty
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="rounded-xl text-xs font-semibold gap-1.5"
          render={<Link href="/admin/receipts/new" />}
        >
          <Plus className="size-3.5" />
          New Receipt
        </Button>
      </div>

      {/* Printable Receipt with Actions */}
      <ReceiptTemplate receipt={receipt} showActions={true} />
    </div>
  );
}
