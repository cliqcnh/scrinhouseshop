import type { Metadata } from "next";
import { ShieldCheck, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupWarranty } from "@/actions/storefront/dashboard";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = { title: "Warranty Lookup" };

interface Props {
  searchParams: Promise<{ serial?: string }>;
}

export default async function WarrantyPage({ searchParams }: Props) {
  const { serial } = await searchParams;

  let result = null;
  if (serial) {
    result = await lookupWarranty(serial);
  }

  // Calculate days left
  const getDaysLeft = (endsAt: string) => {
    return Math.max(
      0,
      Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  };

  const daysLeft = result?.success && result.warranty ? getDaysLeft(result.warranty.endsAt) : 0;
  const isExpired = result?.success && result.warranty && (result.warranty.status !== "active" || daysLeft === 0);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <ShieldCheck className="size-10 mx-auto text-foreground" strokeWidth={1.5} />
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Warranty Verification</h1>
        <p className="text-sm text-muted-foreground">
          Enter your phone&apos;s IMEI or Serial Number to check its official ScrinHouse warranty coverage status.
        </p>
      </div>

      {/* Search Input Box */}
      <form method="GET" className="mt-8 flex gap-3">
        <Input
          name="serial"
          type="text"
          defaultValue={serial ?? ""}
          placeholder="e.g. 35899201948..."
          className="rounded-none border-border"
          required
        />
        <Button type="submit" className="rounded-none px-6">
          Verify
        </Button>
      </form>

      {/* Warranty Details */}
      {serial && (
        <div className="mt-10">
          {!result?.success || !result.warranty ? (
            <div className="border border-border p-6 text-center text-sm text-muted-foreground">
              {result?.error ?? "No active warranty record found for this serial number / IMEI."}
            </div>
          ) : (
            <div className="border border-border p-6 sm:p-8 space-y-6 bg-background">
              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warranty Status</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {isExpired ? (
                      <>
                        <XCircle className="size-4 text-destructive" />
                        <span className="font-semibold text-destructive capitalize">Expired</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span className="font-semibold text-green-600 capitalize">Active Coverage</span>
                      </>
                    )}
                  </div>
                </div>
                {!isExpired && (
                  <span className="bg-green-500/10 text-green-700 font-semibold px-2 py-0.5 text-xs">
                    {daysLeft} days remaining
                  </span>
                )}
              </div>

              {/* Grid details */}
              <dl className="text-sm grid grid-cols-2 gap-4">
                <div className="col-span-2 border-b border-border pb-3">
                  <dt className="text-xs text-muted-foreground">Device Model</dt>
                  <dd className="font-bold text-foreground text-base mt-1">{result.warranty.productName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Serial / IMEI</dt>
                  <dd className="font-mono text-xs text-foreground font-semibold mt-1">{result.warranty.imeiSerial}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Registered To</dt>
                  <dd className="text-foreground font-semibold mt-1">{result.warranty.customerName}</dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="text-xs text-muted-foreground">Coverage Starts</dt>
                  <dd className="text-foreground font-semibold mt-1 flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {formatDate(result.warranty.startsAt)}
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="text-xs text-muted-foreground">Coverage Expires</dt>
                  <dd className="text-foreground font-semibold mt-1 flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {formatDate(result.warranty.endsAt)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
