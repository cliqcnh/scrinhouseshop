import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { InAppChat } from "@/components/storefront/in-app-chat";
import { ReferralTracker } from "@/components/layout/referral-tracker";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { listTopLevelCategories } from "@/services/catalog-service";
import { createClient } from "@/lib/supabase/server";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [categories, supabase] = await Promise.all([
    listTopLevelCategories().catch(() => []),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <InAppChat />
      <ReferralTracker />
      <MobileBottomNav categories={categories} displayName={displayName} />
    </div>
  );
}

