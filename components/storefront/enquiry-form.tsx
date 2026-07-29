"use client";

import { useState } from "react";
import { HelpCircle, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitProductEnquiry } from "@/actions/storefront/enquiry";
import { toast } from "sonner";

interface EnquiryFormProps {
  productId: string;
  productName: string;
}

export function EnquiryForm({ productId, productName }: EnquiryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `Hi, I'm interested in the "${productName}" and would like to get more details about it. Please get back to me.`
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone || !message) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitProductEnquiry(productId, {
        name,
        email,
        phone,
        message,
      });

      if (res.success) {
        setSubmitted(true);
        toast.success("Enquiry sent successfully!");
      } else {
        toast.error(res.error ?? "Failed to submit enquiry.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-lg border border-emerald-100 bg-emerald-50/50 p-5 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-8 text-emerald-500 mb-2" />
        <h3 className="text-sm font-semibold text-emerald-900">Enquiry Submitted!</h3>
        <p className="mt-1 text-xs text-emerald-700 max-w-sm mx-auto leading-relaxed">
          Thank you. Your message has been sent to our shop representatives. We will reply to your account email/phone shortly.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 text-emerald-800"
          onClick={() => {
            setSubmitted(false);
            setIsOpen(false);
          }}
        >
          Send Another Enquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            <span>Have questions about this item?</span>
          </div>
          <span className="text-xs text-primary font-semibold hover:underline">
            Enquire Now
          </span>
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Product Enquiry</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="enq-name" className="text-xs font-semibold text-foreground">
                  Your Name
                </Label>
                <Input
                  id="enq-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="text-base sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="enq-email" className="text-xs font-semibold text-foreground">
                  Email Address
                </Label>
                <Input
                  id="enq-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@example.com"
                  className="text-base sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="enq-phone" className="text-xs font-semibold text-foreground">
                Phone Number
              </Label>
              <Input
                id="enq-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +233 20 820 4749"
                className="text-base sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="enq-msg" className="text-xs font-semibold text-foreground">
                Message / Enquiry Details
              </Label>
              <textarea
                id="enq-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm text-foreground"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2 font-medium">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending Enquiry...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
