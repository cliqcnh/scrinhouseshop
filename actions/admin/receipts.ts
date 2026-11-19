"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { requireStaffUser } from "@/lib/supabase/admin-guard";
import type { CreateReceiptInput, Receipt, ReceiptItem } from "@/types/receipt";

function calculateWarrantyExpiry(issueDate: Date, durationStr: string): string | null {
  const normalized = durationStr.trim().toLowerCase();
  if (normalized.includes("none") || normalized.includes("no warranty") || normalized === "0") {
    return null;
  }

  const date = new Date(issueDate.getTime());

  // Check for week matches (e.g. "1 week", "2 weeks", "1w")
  const weekMatch = normalized.match(/(\d+)\s*(?:week|wk|w)/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10) || 1;
    date.setDate(date.getDate() + weeks * 7);
    return date.toISOString();
  }

  // Check for day matches (e.g. "7 days", "14 days", "30 days")
  const dayMatch = normalized.match(/(\d+)\s*(?:day|d)/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10) || 7;
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  // Check for month matches (e.g. "1 month", "3 months", "6 months")
  const monthMatch = normalized.match(/(\d+)\s*(?:month|mo|m)/i);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10) || 1;
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  }

  // Check for year matches (e.g. "1 year", "2 years")
  const yearMatch = normalized.match(/(\d+)\s*(?:year|yr|y)/i);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10) || 1;
    date.setFullYear(date.getFullYear() + years);
    return date.toISOString();
  }

  // Default fallback: 7 days (1 week)
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

function mapRowToReceipt(row: any): Receipt {
  const items: ReceiptItem[] = Array.isArray(row.items)
    ? row.items.map((it: any, idx: number) => ({
        id: it.id || `item-${idx}`,
        itemType: it.itemType || "product",
        description: it.description || "Item",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total ?? (Number(it.quantity || 1) * Number(it.unitPrice || 0))),
      }))
    : [];

  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    receiptType: row.receipt_type || "repair",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || null,
    deviceModel: row.device_model || null,
    imeiSerial: row.imei_serial || null,
    items,
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    tax: Number(row.tax) || 0,
    totalAmount: Number(row.total_amount) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    paymentMethod: row.payment_method || "cash",
    paymentStatus: row.payment_status || "paid",
    warrantyDuration: row.warranty_duration || "1 Week",
    warrantyTerms:
      row.warranty_terms ||
      "All items and repairs have a 1-week non-damage warranty. Warranty covers manufacturer defects and workmanship only. Physical screen damage, cracks, water damage, or unauthorized tampering void the warranty.",
    warrantyExpiryDate: row.warranty_expiry_date || null,
    notes: row.notes || null,
    issuedByName: row.issued_by_name || null,
    issuedBy: row.issued_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAdminReceipt(
  input: CreateReceiptInput
): Promise<{ success: boolean; id?: string; receiptNumber?: string; error?: string }> {
  try {
    const staff = await requireStaffUser();
    const supabase = await createClient();

    if (!input.customerName?.trim() || !input.customerPhone?.trim()) {
      return { success: false, error: "Customer name and phone number are required." };
    }

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Please add at least one item or repair service." };
    }

    // Process line items & totals
    const processedItems: ReceiptItem[] = input.items.map((it, idx) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unit = Math.max(0, Number(it.unitPrice) || 0);
      return {
        id: `item-${Date.now()}-${idx}`,
        itemType: it.itemType || "product",
        description: it.description?.trim() || "Item",
        quantity: qty,
        unitPrice: unit,
        total: Math.round(qty * unit * 100) / 100,
      };
    });

    const subtotal = processedItems.reduce((acc, curr) => acc + curr.total, 0);
    const discount = Math.max(0, Number(input.discount) || 0);
    const tax = Math.max(0, Number(input.tax) || 0);
    const totalAmount = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100);

    const amountPaid =
      input.amountPaid !== undefined && !Number.isNaN(input.amountPaid)
        ? Math.max(0, Number(input.amountPaid))
        : totalAmount;

    // Generate unique receipt number: e.g. REC-261119-9482
    const now = new Date();
    const yymmdd = now
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "");
    const randomSuffix = nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, "7");
    const receiptNumber = `REC-${yymmdd}-${randomSuffix}`;

    const warrantyDuration = input.warrantyDuration?.trim() || "1 Week";
    const warrantyTerms =
      input.warrantyTerms?.trim() ||
      "All items and repairs have a 1-week non-damage warranty. Warranty covers manufacturer defects and workmanship only. Physical screen damage, cracks, water damage, or unauthorized tampering void the warranty.";
    const warrantyExpiryDate = calculateWarrantyExpiry(now, warrantyDuration);

    const payload = {
      receipt_number: receiptNumber,
      receipt_type: input.receiptType || "repair",
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      customer_email: input.customerEmail?.trim() || null,
      device_model: input.deviceModel?.trim() || null,
      imei_serial: input.imeiSerial?.trim() || null,
      items: processedItems,
      subtotal,
      discount,
      tax,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod || "cash",
      payment_status: input.paymentStatus || (amountPaid >= totalAmount ? "paid" : "partial"),
      warranty_duration: warrantyDuration,
      warranty_terms: warrantyTerms,
      warranty_expiry_date: warrantyExpiryDate,
      notes: input.notes?.trim() || null,
      issued_by: staff.id || null,
      issued_by_name: staff.fullName || staff.email || "ScrinHouse Admin",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("receipts")
      .insert(payload)
      .select("id, receipt_number")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/admin/receipts");
    revalidatePath(`/verify/receipt/${receiptNumber}`);

    return {
      success: true,
      id: inserted.id,
      receiptNumber: inserted.receipt_number,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create receipt.";
    return { success: false, error: message };
  }
}

export async function listAdminReceipts(params?: {
  search?: string;
  type?: string;
  limit?: number;
}): Promise<Receipt[]> {
  await requireStaffUser();
  const supabase = await createClient();

  let query = supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params?.limit || 100);

  if (params?.type && params.type !== "all") {
    query = query.eq("receipt_type", params.type);
  }

  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    query = query.or(
      `receipt_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,device_model.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    console.error("Failed to list receipts:", error.message);
    return [];
  }

  return (data ?? []).map(mapRowToReceipt);
}

export async function getAdminReceiptById(idOrNumber: string): Promise<Receipt | null> {
  await requireStaffUser();
  const supabase = await createClient();

  // Try fetching by ID (uuid) or by receipt_number
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);

  let query = supabase.from("receipts").select("*");
  if (isUuid) {
    query = query.eq("id", idOrNumber);
  } else {
    query = query.eq("receipt_number", idOrNumber);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  return mapRowToReceipt(data);
}

export async function deleteAdminReceipt(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireStaffUser();
    const supabase = await createClient();

    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/receipts");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete receipt";
    return { success: false, error: msg };
  }
}

export interface ReceiptVerificationResult {
  isValid: boolean;
  receipt?: Receipt;
  isWarrantyActive: boolean;
  warrantyDaysLeft: number;
  verificationUrl: string;
}

export async function getPublicReceiptVerification(
  receiptNumber: string
): Promise<ReceiptVerificationResult | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("receipt_number", receiptNumber.trim())
    .maybeSingle();

  if (error || !data) return null;

  const receipt = mapRowToReceipt(data);
  let isWarrantyActive = false;
  let warrantyDaysLeft = 0;

  if (receipt.warrantyExpiryDate) {
    const expiry = new Date(receipt.warrantyExpiryDate).getTime();
    const now = Date.now();
    isWarrantyActive = expiry > now;
    if (isWarrantyActive) {
      warrantyDaysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scrinhouse.com";
  const verificationUrl = `${siteUrl}/verify/receipt/${receipt.receiptNumber}`;

  return {
    isValid: true,
    receipt,
    isWarrantyActive,
    warrantyDaysLeft,
    verificationUrl,
  };
}
