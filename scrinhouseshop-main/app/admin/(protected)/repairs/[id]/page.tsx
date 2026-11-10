import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminRepairById } from "@/actions/admin/repairs";
import { RepairDetailsClient } from "./repair-details-client";

export const metadata: Metadata = { title: "Repair Booking Details" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminRepairDetailPage({ params }: Props) {
  const { id } = await params;
  const booking = await getAdminRepairById(id);

  if (!booking) notFound();

  return <RepairDetailsClient booking={booking} />;
}
