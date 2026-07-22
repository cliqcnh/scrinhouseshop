"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryPendingOrderPayment } from "@/actions/checkout/payment-retry";

interface PaymentRetryButtonProps {
  orderId: string;
}

export function PaymentRetryButton({ orderId }: PaymentRetryButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await retryPendingOrderPayment(orderId);
      if (!res.success) {
        toast.error(res.error ?? "Failed to initialize payment retry.");
        return;
      }

      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        // Mock mode or missing key
        toast.success("Order simulated payment success (Test Mode).");
        window.location.reload();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleRetry}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-none bg-foreground text-background hover:opacity-90 transition-opacity"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      <span>{loading ? "Initializing checkout…" : "Pay Now with Paystack"}</span>
    </Button>
  );
}
