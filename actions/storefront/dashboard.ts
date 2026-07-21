"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export async function getCustomerOrders(): Promise<OrderRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getCustomerWarranties() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("warranties")
    .select(`
      id,
      imei_serial,
      customer_name,
      customer_phone,
      status,
      starts_at,
      ends_at,
      products (
        name,
        slug
      )
    `)
    .eq("user_id", user.id)
    .order("ends_at", { ascending: false });

  if (error || !data) return [];
  return data.map((w: any) => ({
    id: w.id,
    imeiSerial: w.imei_serial,
    customerName: w.customer_name,
    customerPhone: w.customer_phone,
    status: w.status,
    startsAt: w.starts_at,
    endsAt: w.ends_at,
    productName: w.products?.name ?? "Unknown Product",
    productSlug: w.products?.slug ?? "",
  }));
}

export interface TrackedOrder {
  id: string;
  status: string;
  createdAt: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    region: string;
    city: string;
    landmark?: string;
  };
  items: {
    productName: string;
    variantLabel: string | null;
    quantity: number;
    price: number;
  }[];
}

export async function trackOrder(query: string): Promise<{ success: boolean; order?: TrackedOrder; error?: string }> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return { success: false, error: "Please enter a tracking reference." };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  let dbQuery = supabase.from("orders").select(`
    id,
    status,
    created_at,
    delivery_address,
    order_items (
      product_name,
      variant_label,
      quantity,
      price
    )
  `);

  if (isUuid) {
    dbQuery = dbQuery.eq("id", trimmed);
  } else {
    dbQuery = dbQuery.eq("paystack_ref", trimmed);
  }

  const { data, error } = (await dbQuery.maybeSingle()) as any;

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No order found matching this tracking reference." };

  const address = data.delivery_address as any;

  function maskName(str?: string) {
    if (!str) return "Customer";
    return str
      .split(" ")
      .map((part) => (part.length > 1 ? part[0] + "*".repeat(part.length - 1) : part))
      .join(" ");
  }

  function maskPhone(ph?: string) {
    if (!ph || ph.length < 6) return "***";
    return ph.slice(0, 3) + "***" + ph.slice(-4);
  }

  return {
    success: true,
    order: {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
      deliveryAddress: {
        fullName: maskName(address?.fullName),
        phone: maskPhone(address?.phone),
        region: address?.region ?? "",
        city: address?.city ?? "",
        landmark: address?.landmark ? "***" : "",
      },
      items: (data.order_items ?? []).map((item: any) => ({
        productName: item.product_name,
        variantLabel: item.variant_label,
        quantity: item.quantity,
        price: item.price,
      })),
    },
  };
}

export interface TrackedWarranty {
  id: string;
  productName: string;
  customerName: string;
  imeiSerial: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export async function lookupWarranty(imeiSerial: string): Promise<{ success: boolean; warranty?: TrackedWarranty; error?: string }> {
  const supabase = await createClient();
  const trimmed = imeiSerial.trim();
  if (!trimmed) return { success: false, error: "Please enter a serial number or IMEI." };

  const { data, error } = (await supabase
    .from("warranties")
    .select(`
      id,
      imei_serial,
      customer_name,
      status,
      starts_at,
      ends_at,
      products (
        name
      )
    `)
    .eq("imei_serial", trimmed)
    .maybeSingle()) as any;

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "No active warranty record found for this serial number / IMEI." };

  const maskName = (name: string) => {
    return name
      .split(" ")
      .map((part) => (part.length > 0 ? part[0] + "*".repeat(Math.max(1, part.length - 1)) : ""))
      .join(" ");
  };

  return {
    success: true,
    warranty: {
      id: data.id,
      productName: data.products?.name ?? "Unknown Product",
      customerName: maskName(data.customer_name),
      imeiSerial: data.imei_serial,
      status: data.status,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
    },
  };
}
