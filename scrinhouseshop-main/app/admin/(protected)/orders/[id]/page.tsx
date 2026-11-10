import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminOrderById } from "@/actions/admin/orders";
import { OrderDetailsClient } from "./order-details-client";

export const metadata: Metadata = { title: "Order Details" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) notFound();

  return <OrderDetailsClient order={order} />;
}
