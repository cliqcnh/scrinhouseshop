import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";
import { getAddresses } from "@/actions/storefront/addresses";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Auth guard — send to login with redirect back to checkout
  if (!user) redirect("/auth/login?next=/checkout");

  // Fetch profile and saved addresses in parallel
  const [profile, addresses] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then((r) => r.data),
    getAddresses(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Checkout</h1>
      <CheckoutForm
        defaultName={profile?.full_name ?? ""}
        defaultPhone={profile?.phone ?? ""}
        userEmail={user.email ?? ""}
        savedAddresses={addresses}
      />
    </div>
  );
}
