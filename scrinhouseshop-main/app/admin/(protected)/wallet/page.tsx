import { listAdminWithdrawals, getReferralRewardSetting } from "@/actions/admin/wallet";
import { AdminWalletClient } from "@/components/admin/wallet-client";

export const metadata = { title: "Wallet & Withdrawals" };

export default async function AdminWalletPage() {
  const requests = await listAdminWithdrawals();
  const reward = await getReferralRewardSetting();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Wallet Payouts & Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Audit customer withdrawal requests and configure global referral reward settings.
        </p>
      </div>

      <AdminWalletClient initialRequests={requests} initialReward={reward} />
    </div>
  );
}
