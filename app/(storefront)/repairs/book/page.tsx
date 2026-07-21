/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAddresses } from "@/actions/storefront/addresses";
import { listRepairEstimates } from "@/actions/storefront/repairs";
import { BookRepairFormClient } from "./book-form-client";

export const metadata: Metadata = { title: "Book a Phone Repair" };

export default async function BookRepairPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Prefill details from profile if logged in
  let profile = null;
  let addresses: any[] = [];
  
  if (user) {
    const [profileRes, addressesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
      getAddresses(),
    ]);
    profile = profileRes.data;
    addresses = addressesRes;
  }

  // Load estimates defined by admin
  const estimates = await listRepairEstimates();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <BookRepairFormClient
        estimates={estimates}
        defaultName={profile?.full_name ?? ""}
        defaultPhone={profile?.phone ?? ""}
        defaultEmail={user?.email ?? ""}
        savedAddresses={addresses}
      />
    </div>
  );
}
