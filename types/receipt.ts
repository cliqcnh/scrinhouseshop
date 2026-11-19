export type ReceiptType = "repair" | "sale" | "custom";
export type PaymentMethod = "cash" | "momo" | "card" | "bank_transfer";
export type PaymentStatus = "paid" | "partial" | "pending";
export type ReceiptItemType = "product" | "repair_part" | "workmanship" | "service" | "accessory";

export interface ReceiptItem {
  id: string;
  itemType: ReceiptItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  receiptType: ReceiptType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deviceModel?: string | null;
  imeiSerial?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  warrantyDuration: string;
  warrantyTerms: string;
  warrantyExpiryDate?: string | null;
  notes?: string | null;
  issuedByName?: string | null;
  issuedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptInput {
  receiptType: ReceiptType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceModel?: string;
  imeiSerial?: string;
  items: Array<{
    itemType: ReceiptItemType;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  discount?: number;
  tax?: number;
  amountPaid?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  warrantyDuration: string;
  warrantyTerms?: string;
  notes?: string;
}
