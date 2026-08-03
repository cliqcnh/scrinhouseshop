import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { InAppChat } from "@/components/storefront/in-app-chat";
import { ReferralTracker } from "@/components/layout/referral-tracker";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <InAppChat />
      <ReferralTracker />
    </div>
  );
}
