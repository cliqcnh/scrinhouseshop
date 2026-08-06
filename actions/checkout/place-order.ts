"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import type { CartItem } from "@/stores/cart";
import { sendSMS, sendEmail } from "@/lib/notifications";

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
  walletAmountToApply?: number,
): Promise<PlaceOrderResult> {
  const supabase = await createClient();

  // ── Auth check ────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to place an order.");

  if (cartItems.length === 0) throw new Error("Your cart is empty.");

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

  const subtotal = calculatedSubtotal;
  const deliveryFee = 0;
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

  const installmentDeposit = verifiedDepositTotal;
  const installmentBalance = verifiedBalanceTotal;

  // ── Insert order ──────────────────────────────────────────────────────────
  const paystackRef = `SCR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const { data: order, error: orderErr } = await (supabase.from("orders") as any)
    .insert({
      user_id: user.id,
      status: remainingTotal === 0 ? "paid" : "pending_payment",
      delivery_address: address as unknown as Record<string, unknown>,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      paystack_ref: remainingTotal === 0 ? null : paystackRef,
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
        ghana_card_front_url: installmentDetails.ghanaCardFrontUrl || "N/A",
        ghana_card_back_url: installmentDetails.ghanaCardBackUrl || "N/A",
        status: "pending_review",
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

  if (remainingTotal > 0 && env.PAYSTACK_SECRET_KEY && !hasInstallment) {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(remainingTotal * 100), // remaining due in pesewas
        currency: "GHS",
        reference: paystackRef,
        metadata: {
          orderId: order.id,
          customerName: address.fullName,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/order/${order.id}?ref=${paystackRef}`,
      }),
    });

    if (paystackRes.ok) {
      const json = (await paystackRes.json()) as { data?: { authorization_url?: string } };
      authorizationUrl = json.data?.authorization_url ?? null;
    }
  }

  // Trigger order initiation alerts in background
  if (user.email) {
    const formattedTotal = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(total);
    const trackingLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track?q=${order.id}`;
    
    await sendSMS(
      address.phone,
      `Hello ${address.fullName}, your ScrinHouse order has been received! Total: ${formattedTotal}. Ref: ${paystackRef}. Track here: ${trackingLink}`
    );

    await sendSMS(
      "0559257401",
      `[ADMIN ALERT] New order #${order.id.slice(0, 8).toUpperCase()} placed by ${address.fullName} (${address.phone}). Total: ${formattedTotal}. Type: ${hasInstallment ? "Installment" : "Regular"}`
    );

    await sendEmail(
      user.email,
      `Order Received - ScrinHouse`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">Order Received!</h2>
        <p>Hello ${address.fullName},</p>
        <p>Thank you for shopping with ScrinHouse! We have successfully recorded your order.</p>
        <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Total Amount:</strong> ${formattedTotal}</p>
        <p><strong>Payment Reference:</strong> ${paystackRef}</p>
        ${authorizationUrl ? `<p>If you haven't finished payment, you can complete it here: <a href="${authorizationUrl}">Complete Payment</a></p>` : ""}
        <p>You can track your order delivery progress anytime: <a href="${trackingLink}">Track Order Progress</a></p>
        <p style="margin-top: 20px; color: #888; text-align: center; font-size: 11px;">&copy; ${new Date().getFullYear()} ScrinHouse GH. All rights reserved.</p>
      </div>`
    );
  }

  return { orderId: order.id, paystackRef: remainingTotal === 0 ? "WALLET" : paystackRef, authorizationUrl };
}
