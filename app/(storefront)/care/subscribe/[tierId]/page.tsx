/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscribeForm } from "./subscribe-form";

export const metadata: Metadata = {
  title: "Subscribe to ScrinHouse Care",
};

interface Props {
  params: Promise<{ tierId: string }>;
}

export default async function SubscribePage({ params }: Props) {
  const { tierId } = await params;
  const supabase = await createClient();

  // Redirect to login if user is not authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/care/subscribe/${tierId}`);
  }

  // Fetch tier details
  const { data: tier, error } = await (supabase.from("care_tiers") as any)
    .select("id, name, price, screen_limit, screen_copay_percentage")
    .eq("id", tierId)
    .maybeSingle();

  if (error || !tier) {
    notFound();
  }

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Complete Subscription
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Provide your device IMEI and model details below to lock in protection coverage.
          </p>
        </div>

        <SubscribeForm tier={{
          id: tier.id,
          name: tier.name,
          price: Number(tier.price),
          screen_limit: tier.screen_limit,
          screen_copay_percentage: Number(tier.screen_copay_percentage),
        }} />
      </div>
    </div>
  );
}
