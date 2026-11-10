import type { Metadata } from "next";
import { listAdminRepairs } from "@/actions/admin/repairs";
import { listRepairEstimates } from "@/actions/storefront/repairs";
import { RepairsManagerClient } from "./repairs-manager-client";

export const metadata: Metadata = { title: "Repairs Bookings" };

export default async function AdminRepairsPage() {
  const [bookings, estimates] = await Promise.all([
    listAdminRepairs(),
    listRepairEstimates(),
  ]);

  return (
    <RepairsManagerClient
      initialBookings={bookings}
      initialEstimates={estimates}
    />
  );
}
