"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { bindReferralCode } from "@/actions/storefront/wallet";

function TrackerInner() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (refCode) {
      localStorage.setItem("scrinhouse_ref", refCode.trim().toUpperCase());
    }

    const storedRef = localStorage.getItem("scrinhouse_ref");
    if (storedRef) {
      bindReferralCode(storedRef).then((res) => {
        if (res.success) {
          // Successfully bound, clean up
          localStorage.removeItem("scrinhouse_ref");
        }
      }).catch((err) => {
        console.error("Failed to bind referral code:", err);
      });
    }
  }, [refCode]);

  return null;
}

export function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
