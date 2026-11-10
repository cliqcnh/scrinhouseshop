"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getServerEnv, getAppBaseUrl } from "@/lib/env";
import type { CartItem } from "@/stores/cart";
import { sendSMS, sendEmail } from "@/lib/notifications";
import { sendAdminOrderPushNotification } from "@/lib/push-notifications";

async function uploadGhanaCardImage(dataUrl: string | undefined, fileName: string): Promise<string> {
  if (!dataUrl || !dataUrl.trim()) return "N/A";
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  try {
    const env = getServerEnv();
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return dataUrl;

    const adminSupabase = createServiceRoleClient();
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = contentType.split("/")[1] || "jpg";
    const storagePath = `ghana-cards/${fileName}.${ext}`;

    const { error: uploadError } = await adminSupabase.storage
      .from("product-media")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Failed to upload Ghana Card photo to storage (${storagePath}):`, uploadError.message);
      return dataUrl;
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from("product-media")
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl || dataUrl;
  } catch (err) {
    console.error("Error processing Ghana Card photo upload:", err);
    return dataUrl;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DeliveryAddress {
  fullName: string;
  phone: string;
  region: string;
  city: string;
  landmark?: string;
}

export interface InstallmentDetails {
  ghanaCardNumber: string;
  ghanaCardFrontUrl?: string;
  ghanaCardBackUrl?: string;
}

export interface PlaceOrderResult {
  orderId: string;
  paystackRef: string;
  authorizationUrl: string | null;
}

/**
 * 1. Re-validates stock on the server (prevents race conditions).
 * 2. Inserts the order + order_items (status = pending_payment).
 * 3. Saves installment applications if Ghana Card details provided.
 * 4. Initializes a Paystack transaction for the total due today.
 */
export async function placeOrder(
  cartItems: CartItem[],
  address: DeliveryAddress,
  installmentDetails?: InstallmentDetails,
  walletAmountToApply = 0,
  paymentMethod: "paystack" | "pod" = "paystack",
): Promise<PlaceOrderResult> {
  const supabase = await createClient();

  // ── Auth check ────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to place an order.");

  if (cartItems.length === 0) throw new Error("Your cart is empty.");

  const isAccra = address.region.toLowerCase().includes("accra");
  if (paymentMethod === "pod" && !isAccra) {
    throw new Error("Payment on Delivery is only available for customers in the Greater Accra region.");
  }

  // ── Stock & Financial Validation ───────────────────────────────────────────
  const variantIds = cartItems.map((i) => i.variantId);
  const { data: variants, error: variantErr } = await (supabase.from("product_variants") as any)
    .select("id, sku, price, stock_quantity, is_active, products(name, product_type, allow_installments, installment_profit_percentage, installment_deposit_percentage, categories!products_category_id_fkey(slug))")
    .in("id", variantIds);

  if (variantErr) throw new Error(`Stock check failed: ${variantErr.message}`);

  // Fetch global installment settings
  const { data: globalSetting } = await (supabase.from("store_settings") as any)
    .select("value")
    .eq("key", "installment_config")
    .maybeSingle();

  const globalConfig = globalSetting
    ? (globalSetting as any).value
    : { profit_percentage: 20, deposit_percentage: 40, is_enabled: true };

  const globalProfitRate = (globalConfig.profit_percentage ?? 20) / 100;
  const globalDepositRate = (globalConfig.deposit_percentage ?? 40) / 100;

  let calculatedSubtotal = 0;
  let verifiedDepositTotal = 0;
  let verifiedBalanceTotal = 0;

  for (const item of cartItems) {
    const variant = variants?.find((v: any) => v.id === item.variantId);
    if (!variant || !variant.is_active) {
      throw new Error(`"${item.name}" is no longer available.`);
    }
    if (variant.stock_quantity < item.quantity) {
      throw new Error(
        `Only ${variant.stock_quantity} unit(s) of "${item.name}" remain in stock.`,
      );
    }

    const parentProduct = (variant as any).products;
    const isAllowedForProduct = parentProduct?.allow_installments !== false;
    const realPrice = Number(variant.price);

    if (item.isInstallment) {
      if (!isAllowedForProduct) {
        throw new Error(`Installment payment plan is not enabled for "${item.name}".`);
      }

      // Read custom values if defined, fallback to global values
      const profitRate = parentProduct.installment_profit_percentage !== null
        ? parentProduct.installment_profit_percentage / 100
        : globalProfitRate;

      const depositRate = parentProduct.installment_deposit_percentage !== null
        ? parentProduct.installment_deposit_percentage / 100
        : globalDepositRate;

      // Calculate verified deposit amount from server math
      const totalInstallmentPrice = Math.round(realPrice * (1 + profitRate) * 100) / 100;
      const depositAmount = Math.round(totalInstallmentPrice * depositRate * 100) / 100;
      const remainingBalance = Math.round((totalInstallmentPrice - depositAmount) * 100) / 100;

      calculatedSubtotal += depositAmount * item.quantity;
      verifiedDepositTotal += depositAmount * item.quantity;
      verifiedBalanceTotal += remainingBalance * item.quantity;
    } else {
      calculatedSubtotal += realPrice * item.quantity;
    }
  }

  // ── Financial calculations ────────────────────────────────────────────────
  const hasInstallment = cartItems.some((i) => i.isInstallment);
  if (hasInstallment && !installmentDetails) {
    throw new Error("Ghana Card details are required for installment orders.");
  }

  // Fetch delivery settings
  const { data: deliverySetting } = await (supabase.from("store_settings") as any)
    .select("value")
    .eq("key", "delivery_config")
    .maybeSingle();

  const deliveryConfig = deliverySetting?.value ?? {
    phones_accra: 35,
    phones_outside: 70,
    consoles_accra: 50,
    consoles_outside: 100,
    others_accra: 25,
    others_outside: 50,
  };

  const subtotal = calculatedSubtotal;
  const deliveryFee = calculateDeliveryFeeFromServer(variants ?? [], address.region, deliveryConfig);
  const total = subtotal + deliveryFee;

  let appliedWalletAmount = 0;
  if (walletAmountToApply && walletAmountToApply > 0) {
    const { data: wallet } = await (supabase.from("wallets") as any)
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();

    const actualBalance = wallet ? Number((wallet as any).balance) : 0;
    appliedWalletAmount = Math.min(actualBalance, total, walletAmountToApply);
  }

  const remainingTotal = total - appliedWalletAmount;

  // For Payment on Delivery (Accra Only), the customer pays the delivery fee upfront before item dispatch
  let amountToPayOnline = remainingTotal;
  if (paymentMethod === "pod") {
    amountToPayOnline = Math.max(0, deliveryFee - appliedWalletAmount);
  }

  const installmentDeposit = verifiedDepositTotal;
  const installmentBalance = verifiedBalanceTotal;

  // ── Insert order ──────────────────────────────────────────────────────────
  const paystackRef = `SCR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const baseUrl = getAppBaseUrl();

  const { data: order, error: orderErr } = await (supabase.from("orders") as any)
    .insert({
      user_id: user.id,
      status: amountToPayOnline === 0 ? (paymentMethod === "pod" ? "pending_delivery" : "paid") : "pending_payment",
      delivery_address: { ...address, paymentMethod } as unknown as Record<string, unknown>,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      paystack_ref: amountToPayOnline === 0 ? (paymentMethod === "pod" ? `POD-${paystackRef}` : "WALLET") : paystackRef,
      wallet_amount_applied: appliedWalletAmount,
      is_installment: hasInstallment,
      installment_deposit: installmentDeposit,
      installment_balance: installmentBalance,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    throw new Error(`Failed to create order: ${orderErr?.message}`);
  }

  // Deduct from wallet and log transaction if wallet was applied
  if (appliedWalletAmount > 0) {
    const { data: w } = await (supabase.from("wallets") as any)
      .select("balance")
      .eq("id", user.id)
      .single();

    const currentBal = w ? Number((w as any).balance) : 0;
    const finalBal = currentBal - appliedWalletAmount;

    const { error: deductErr } = await (supabase.from("wallets") as any)
      .update({ balance: finalBal, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (deductErr) {
      throw new Error(`Failed to deduct wallet: ${deductErr.message}`);
    }

    await (supabase.from("wallet_transactions") as any).insert({
      user_id: user.id,
      type: "purchase_payment",
      amount: -appliedWalletAmount,
      description: `Payment for Order #${order.id.slice(0, 8).toUpperCase()}`,
      reference_id: order.id,
    });
  }

  // Save Installment Applications if applicable
  if (hasInstallment && installmentDetails) {
    let finalFrontUrl = installmentDetails.ghanaCardFrontUrl || "N/A";
    let finalBackUrl = installmentDetails.ghanaCardBackUrl || "N/A";

    if (finalFrontUrl.startsWith("data:image/")) {
      finalFrontUrl = await uploadGhanaCardImage(finalFrontUrl, `${order.id}_front`);
    }
    if (finalBackUrl.startsWith("data:image/")) {
      finalBackUrl = await uploadGhanaCardImage(finalBackUrl, `${order.id}_back`);
    }

    const installmentRows = cartItems
      .filter((i) => i.isInstallment)
      .map((item) => ({
        order_id: order.id,
        user_id: user.id,
        product_id: item.productId,
        variant_id: item.variantId,
        base_price: item.price,
        total_price: item.totalInstallmentPrice ?? item.price * 1.20,
        deposit_amount: item.depositAmount ?? item.price * 0.48,
        remaining_balance: item.remainingBalance ?? item.price * 0.72,
        ghana_card_number: installmentDetails.ghanaCardNumber,
        ghana_card_front_url: finalFrontUrl,
        ghana_card_back_url: finalBackUrl,
        status: "pending_review",
        installment_frequency: item.installmentFrequency || "monthly",
      }));

    if (installmentRows.length > 0) {
      const { error: instErr } = await (supabase.from("installment_applications") as any).insert(installmentRows);
      if (instErr) {
        console.error("Failed to save installment application:", instErr.message);
      }
    }
  }

  // ── Insert order items ────────────────────────────────────────────────────
  const variantMap = new Map((variants as any[] ?? []).map((v: any) => [v.id, v]));
  const orderItems = cartItems.map((item) => ({
    order_id: order.id,
    variant_id: item.variantId,
    product_id: item.productId,
    product_name: item.name,
    variant_label: item.variantLabel || null,
    sku: variantMap.get(item.variantId)?.sku ?? item.variantId,
    image_url: item.imageUrl,
    price: (item.isInstallment && item.depositAmount !== undefined) ? item.depositAmount : item.price,
    quantity: item.quantity,
    subtotal: ((item.isInstallment && item.depositAmount !== undefined) ? item.depositAmount : item.price) * item.quantity,
  }));

  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) throw new Error(`Failed to save order items: ${itemsErr.message}`);

  // ── Initialize Paystack transaction ──────────────────────────────────────
  const env = getServerEnv();
  let authorizationUrl: string | null = null;

  if (amountToPayOnline > 0 && env.PAYSTACK_SECRET_KEY && !hasInstallment) {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amountToPayOnline * 100),
        currency: "GHS",
        reference: paystackRef,
        metadata: {
          orderId: order.id,
          customerName: address.fullName,
          paymentMethod,
          isPodDeliveryFee: paymentMethod === "pod",
        },
        callback_url: `${baseUrl}/order/${order.id}?ref=${paystackRef}`,
      }),
    });

    if (paystackRes.ok) {
      const json = (await paystackRes.json()) as { data?: { authorization_url?: string } };
      authorizationUrl = json.data?.authorization_url ?? null;
    } else {
      const errJson = await paystackRes.json().catch(() => null);
      console.error("Paystack transaction initialization failed:", paystackRes.status, errJson);
    }
  }

  // ── Notification Alerts ──────────────────────────────────────────────────
  // Only send SMS, Email, and Admin alerts when payment has been completed or for installment applications.
  // If payment is pending on Paystack, notifications are dispatched upon payment verification via webhook.
  const isSettled = amountToPayOnline === 0 || hasInstallment;

  if (isSettled && user.email) {
    const formattedTotal = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(total);
    const trackingLink = `${baseUrl}/track?q=${order.id}`;
    const formattedDeliveryFee = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(deliveryFee);

    if (address.phone) {
      if (paymentMethod === "pod") {
        await sendSMS(
          address.phone,
          `Hello ${address.fullName}, your ScrinHouse Accra Payment on Delivery order has been confirmed! Delivery Fee: ${formattedDeliveryFee} (Paid). Item balance on delivery: ${new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(subtotal)}. Track: ${trackingLink}`
        );
      } else {
        await sendSMS(
          address.phone,
          `Hello ${address.fullName}, your ScrinHouse order #${order.id.slice(0, 8).toUpperCase()} has been confirmed! Total: ${formattedTotal}. Track here: ${trackingLink}`
        );
      }
    }

    const productNames = cartItems
      .map((item) => `${item.name} (x${item.quantity})`)
      .join(", ");

    // Admin SMS Alert (0559257401)
    await sendSMS(
      "0559257401",
      `[ADMIN ALERT] Order #${order.id.slice(0, 8).toUpperCase()} (${paymentMethod === "pod" ? "Accra POD" : hasInstallment ? "Installment" : "Paid"}) placed by ${address.fullName} (${address.phone}). Total: ${formattedTotal}. Items: ${productNames}`
    );

    // Admin Web Push Notification
    const productSummary = cartItems.map((item) => `${item.name} (x${item.quantity})`).join(", ");
    await sendAdminOrderPushNotification({
      title: `🛒 Paid Order #${order.id.slice(0, 8).toUpperCase()} ${paymentMethod === "pod" ? "(Accra POD)" : ""}`,
      body: `Placed by ${address.fullName} (${formattedTotal}). Items: ${productSummary}`,
      url: `/admin/orders/${order.id}`,
      orderId: order.id,
    }).catch((err) => console.error("Web Push dispatch error:", err));

    // Customer Email
    await sendEmail(
      user.email,
      `Order Confirmed - ScrinHouse`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #22c55e;">Order Confirmed!</h2>
        <p>Hello ${address.fullName},</p>
        <p>Thank you for shopping with ScrinHouse! Your order has been successfully confirmed.</p>
        <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Total Amount:</strong> ${formattedTotal}</p>
        <p>You can track your order delivery progress anytime: <a href="${trackingLink}">${trackingLink}</a></p>
        <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
      </div>`
    );
  }

  return { orderId: order.id, paystackRef: amountToPayOnline === 0 ? "WALLET" : paystackRef, authorizationUrl };
}

// ─── Delivery Fee Math Helpers ────────────────────────────────────────────────

function calculateDeliveryFeeFromServer(variants: any[], region: string, config: any): number {
  const isAccra = region.toLowerCase().includes("accra");

  let hasConsole = false;
  let hasPhone = false;

  for (const v of variants) {
    const prod = v.products;
    if (!prod) continue;
    const type = prod.product_type;
    const slug = prod.categories?.slug ?? "";

    if (type === "phone" || slug.includes("phone")) {
      hasPhone = true;
    }
    if (slug.includes("console")) {
      hasConsole = true;
    }
  }

  if (hasConsole) {
    return isAccra ? Number(config.consoles_accra ?? 50) : Number(config.consoles_outside ?? 100);
  }
  if (hasPhone) {
    return isAccra ? Number(config.phones_accra ?? 35) : Number(config.phones_outside ?? 70);
  }
  return isAccra ? Number(config.others_accra ?? 25) : Number(config.others_outside ?? 50);
}

export async function getCartDeliveryFee(variantIds: string[], region: string): Promise<number> {
  const supabase = await createClient();
  const { data: variants } = await (supabase.from("product_variants") as any)
    .select("id, products(product_type, categories!products_category_id_fkey(slug))")
    .in("id", variantIds);

  const { data: deliverySetting } = await (supabase.from("store_settings") as any)
    .select("value")
    .eq("key", "delivery_config")
    .maybeSingle();

  const config = deliverySetting?.value ?? {
    phones_accra: 35,
    phones_outside: 70,
    consoles_accra: 50,
    consoles_outside: 100,
    others_accra: 25,
    others_outside: 50,
  };

  return calculateDeliveryFeeFromServer(variants ?? [], region, config);
}
