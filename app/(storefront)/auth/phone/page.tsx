"use client";

import { useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { Phone, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { updateProfilePhone } from "@/actions/auth/customer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default function PhoneRequiredPage({ searchParams }: Props) {
  const router = useRouter();
  const { next: rawNext } = use(searchParams);
  const next = rawNext ?? "/account";

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client-side check
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 9 || digits.length > 15) {
      setError("Please enter a valid phone number (9 to 15 digits).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateProfilePhone(phone);
        if (!res.success) {
          setError(res.error ?? "Failed to update phone number.");
          return;
        }

        setSuccess(true);
        toast.success("Phone number saved successfully!");
        
        // Wait a brief moment and redirect
        setTimeout(() => {
          router.push(next);
          router.refresh();
        }, 800);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(msg);
      }
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Phone className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Phone Number Required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We need your phone number to send you SMS notifications for orders, repairs, and delivery updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive animate-in shake duration-200">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-600 dark:text-green-400 animate-in fade-in duration-200">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Saved! Redirecting you now...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-phone">Phone Number</Label>
            <Input
              id="auth-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0244123456 or +233244123456"
              required
              disabled={isPending || success}
              className="py-6 text-base"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={isPending || success}
            className="w-full py-6 text-sm font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Saving Phone Number...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
