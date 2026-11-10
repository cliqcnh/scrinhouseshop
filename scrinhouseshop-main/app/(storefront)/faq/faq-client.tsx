"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS_BY_CATEGORY: Record<string, FAQItem[]> = {
  "Shopping & Delivery": [
    {
      question: "Are your phones brand new or used?",
      answer: "We offer both! Brand new smartphones arrive sealed in their original manufacturer packaging. Our UK-used devices are rigorously tested by our technical team, graded by condition (Grade A/B), and come with a detailed diagnostic verification report.",
    },
    {
      question: "What delivery options do you offer?",
      answer: "Since we operate completely online, we deliver all orders directly to your doorstep. Delivery is available across Accra and major regions in Ghana. Orders are processed immediately and delivery usually takes between 1-3 business days.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We support secure payments via Paystack, which accepts all major Ghanaian Mobile Money networks (MTN Momo, Telecel Cash, AT Money) and credit/debit cards (Visa, Mastercard).",
    },
  ],
  "Repairs & Service": [
    {
      question: "How does the doorstep repair service work?",
      answer: "Simply navigate to our Repair Booking wizard, select your device model and issue, and choose the Pickup & Return option. A dedicated rider will pick up your device, deliver it to our technical workshop for repair, and return it to you once fixed. You can track the real-time status of your repair from your dashboard.",
    },
    {
      question: "What parts do you use for screen and battery replacements?",
      answer: "We only use original equipment manufacturer (OEM) or premium grade-A replacement parts to ensure that your device retains its original screen brightness, touch sensitivity, and battery performance.",
    },
    {
      question: "Do I have to pay upfront for repairs?",
      answer: "No. You only pay the estimated diagnostic fee upfront if choosing pickup. Once we analyze the device and provide a final cost quote, we only require full payment once the repair is complete and successfully verified.",
    },
  ],
  "Warranty & Coverage": [
    {
      question: "Do purchases and repairs come with a warranty?",
      answer: "Yes. Brand new phones come with official manufacturer warranties. All UK-used devices and repair services come with a standard ScrinHouse service warranty (ranging from 30 to 180 days depending on the service/device type). You can check your active warranty status anytime using your IMEI serial number.",
    },
    {
      question: "What is your return policy?",
      answer: "We offer a 7-day return policy for storefront purchases if the device has a verified hardware defect that was not listed at the time of purchase. Please refer to our Returns Policy page for complete steps.",
    },
  ],
};

export function FAQClient() {
  const [openIndexes, setOpenIndexes] = useState<Record<string, number | null>>({
    "Shopping & Delivery": null,
    "Repairs & Service": null,
    "Warranty & Coverage": null,
  });

  function toggleIndex(category: string, idx: number) {
    setOpenIndexes((prev) => ({
      ...prev,
      [category]: prev[category] === idx ? null : idx,
    }));
  }

  return (
    <div className="space-y-12">
      {Object.entries(FAQS_BY_CATEGORY).map(([category, items]) => (
        <div key={category} className="space-y-4">
          <h3 className="font-heading text-lg font-bold border-b border-border pb-3 mb-6">
            {category}
          </h3>
          <div className="divide-y divide-border border-b border-border">
            {items.map((item, idx) => {
              const isOpen = openIndexes[category] === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => toggleIndex(category, idx)}
                    className="flex w-full items-center justify-between text-left font-semibold text-sm hover:text-[#1d4ed8]"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
