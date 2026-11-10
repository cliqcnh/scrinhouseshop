import type { Metadata } from "next";
import { Mail, Phone, Clock } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with ScrinHouse GH. We are an online store for smartphones and repairs.",
};

export default function ContactPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Contact Us
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Have questions about our smartphones, delivery options, or repair services? We are here to help.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-12 lg:grid-cols-3 lg:items-start">
          {/* Support Channels Column */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-4">
                Support Channels
              </h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                As a fully online service, our support team is available via email and phone to help with catalog questions, tracking updates, and repair diagnostic advice.
              </p>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <Phone className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Phone Support</h4>
                <p className="text-sm text-[#1d4ed8] mt-1 font-mono">+233 50 123 4567</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <Mail className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Email Support</h4>
                <p className="text-sm text-[#1d4ed8] mt-1 font-mono">support@scrinhouse.com</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-[#fcfcfc] text-foreground">
                <Clock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Working Hours</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Monday – Saturday<br />
                  8:00 AM – 6:00 PM (GMT)
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
