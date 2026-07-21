import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { listInstallmentApplications, getInstallmentConfig } from "@/actions/admin/installments";
import { InstallmentListClient } from "./installment-list-client";
import { InstallmentSettingsCard } from "./installment-settings-card";

export const metadata: Metadata = {
  title: "Installment Applications - Admin",
};

export default async function AdminInstallmentsPage() {
  const [items, config] = await Promise.all([
    listInstallmentApplications(),
    getInstallmentConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-6 text-foreground" /> Hire Purchase / Installment Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure installment percentages, review down-payment applications, and verify Ghana Card documents.
          </p>
        </div>
      </div>

      <InstallmentSettingsCard initialConfig={config} />

      <InstallmentListClient initialItems={items} />
    </div>
  );
}
