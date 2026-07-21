import type { Metadata } from "next";
import { AlertCircle, HelpCircle, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Returns Policy",
  description: "Learn about our 7-day return policy and device warranty coverage at ScrinHouse GH.",
};

export default function ReturnsPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Returns Policy
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            We stand behind the quality of our smartphones. Here is what you need to know about our returns and hardware exchange guarantee.
          </p>
        </div>

        <div className="space-y-12">
          {/* Section 1 */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-4">
              7-Day Return Guarantee
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If a smartphone purchased from ScrinHouse develops an unlisted hardware defect (such as display issues, audio faults, cellular connectivity failure, or charging port defects) within **7 days of delivery**, you are eligible for a replacement, swap, or a full refund.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-4">
              Conditions for Return
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              To be eligible for a return or swap, the device must satisfy the following conditions:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2.5 pl-4 leading-relaxed">
              <li>Must show no new signs of user-inflicted physical damage (cracks, dents, deep scratches).</li>
              <li>Must show no evidence of liquid exposure or water damage.</li>
              <li>Must be returned with any included accessories, boxes, and chargers that arrived with it.</li>
              <li>Must have all personal iCloud, Google, or passcode locks completely removed.</li>
              <li>Must display the original IMEI serial number matching your order receipt.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-4">
              How to Initiate a Return
            </h3>
            <div className="border border-border p-6 bg-[#fcfcfc] rounded-none space-y-4">
              <div className="flex gap-3 items-start">
                <AlertCircle className="size-5 text-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Step 1: Contact Support</strong><br />
                  Email our support team at <span className="font-mono text-foreground font-semibold">returns@scrinhouse.com</span> or call us at <span className="font-mono text-foreground font-semibold">+233 50 123 4567</span>. State your Order ID and describe the hardware issue.
                </div>
              </div>
              <div className="flex gap-3 items-start border-t border-border pt-4">
                <ShieldAlert className="size-5 text-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Step 2: Pickup Scheduling</strong><br />
                  Our dispatch team will schedule a pickup rider to collect the device from your address. The diagnostic inspection is completely free of charge.
                </div>
              </div>
              <div className="flex gap-3 items-start border-t border-border pt-4">
                <HelpCircle className="size-5 text-foreground shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Step 3: Verification & Refund</strong><br />
                  Once our technical workshop verifies the device issue, we will issue a replacement model or initiate a Mobile Money / Bank card refund within 48 hours.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
