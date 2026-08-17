"use client";

import { useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/format";
import { useCartStore } from "@/stores/cart";
import type { ProductDetail } from "@/types/catalog";
import { toggleWishlist } from "@/actions/storefront/wishlist";

import { calculateInstallment, type InstallmentConfig } from "@/lib/installments";

export function AddToCartPanel({ 
  product,
  initialWishlistState,
  installmentConfig,
}: { 
  product: ProductDetail;
  initialWishlistState?: boolean;
  installmentConfig?: InstallmentConfig;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [wishlisted, setWishlisted] = useState(initialWishlistState ?? false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"full" | "installment">("full");
  const [installmentFrequency, setInstallmentFrequency] = useState<"monthly" | "weekend">("monthly");

  async function handleToggleWishlist() {
    setWishlistLoading(true);
    try {
      const result = await toggleWishlist(product.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update wishlist");
        return;
      }
      setWishlisted(result.isWishlisted ?? false);
      toast.success(result.isWishlisted ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      toast.error("Please login to add items to wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }

  const storages = useMemo(
    () => [...new Set(product.variants.map((v) => v.storage).filter(Boolean))] as string[],
    [product.variants],
  );
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color).filter(Boolean))] as string[],
    [product.variants],
  );

  const [selectedStorage, setSelectedStorage] = useState<string | undefined>(storages[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant =
    product.variants.find(
      (v) => (!storages.length || v.storage === selectedStorage) && (!colors.length || v.color === selectedColor),
    ) ?? product.variants[0];

  const isEligibleForInstallment = product.allowInstallments === true && installmentConfig?.isEnabled !== false;
  const currentPrice = selectedVariant?.price ?? product.basePrice;
  const installment = useMemo(() => calculateInstallment(currentPrice, installmentConfig), [currentPrice, installmentConfig]);

  const maxQuantity = selectedVariant?.stockQuantity ?? 0;
  const inStock = maxQuantity > 0;

  // Monthly vs Weekend repayment calculators (dynamic)
  const monthlyPaymentsCount = installment.durationMonths;
  const weekendPaymentsCount = installment.durationMonths * 4;
  const monthlyRate = Math.round((installment.remainingBalance / monthlyPaymentsCount) * 100) / 100;
  const weekendRate = Math.round((installment.remainingBalance / weekendPaymentsCount) * 100) / 100;

  function buildVariantLabel() {
    const parts = [selectedStorage, selectedColor].filter(Boolean);
    return parts.join(" / ");
  }

  function handleAddToCart() {
    if (!selectedVariant || !inStock) return;

    if (isEligibleForInstallment && paymentMode === "installment") {
      const planLabel = installmentFrequency === "monthly"
        ? `${installment.durationMonths} Months Monthly`
        : `${installment.durationMonths} Months Weekend`;
      addItem({
        variantId: selectedVariant.id,
        productId: product.id,
        name: product.name,
        variantLabel: buildVariantLabel() ? `${buildVariantLabel()} (Installment: ${planLabel})` : `Installment: ${planLabel}`,
        imageUrl: product.images[0]?.url ?? product.primaryImageUrl ?? null,
        price: selectedVariant.price,
        quantity,
        isInstallment: true,
        depositAmount: installment.depositAmount,
        remainingBalance: installment.remainingBalance,
        totalInstallmentPrice: installment.totalPrice,
        installmentFrequency,
      });
    } else {
      addItem({
        variantId: selectedVariant.id,
        productId: product.id,
        name: product.name,
        variantLabel: buildVariantLabel(),
        imageUrl: product.images[0]?.url ?? product.primaryImageUrl ?? null,
        price: selectedVariant.price,
        quantity,
      });
    }

    toast.success(`${product.name} added to cart`, {
      description: isEligibleForInstallment && paymentMode === "installment" ? `Added under ${installmentFrequency === "monthly" ? "Monthly" : "Weekend"} installment plan` : buildVariantLabel() || undefined,
      action: { label: "View cart", onClick: () => window.dispatchEvent(new CustomEvent("open-cart")) },
    });
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Payment Option Selector - Restricted to Phones */}
      {isEligibleForInstallment && (
        <div className="border border-border p-4 bg-[#fcfcfc] space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Select Payment Plan</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode("full")}
              className={cn(
                "border p-3 text-left transition-colors text-xs font-semibold rounded-none",
                paymentMode === "full"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-white text-foreground hover:border-foreground/40",
              )}
            >
              <div>Full Payment</div>
              <div className="text-[11px] opacity-80 font-normal mt-0.5">{formatPrice(currentPrice)}</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode("installment")}
              className={cn(
                "border p-3 text-left transition-colors text-xs font-semibold rounded-none relative",
                paymentMode === "installment"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-white text-foreground hover:border-foreground/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span>Pay {installment.depositPercentage}% Deposit</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#1d4ed8] text-white font-bold">{installment.profitPercentage}% Plan</span>
              </div>
              <div className="text-[11px] opacity-80 font-normal mt-0.5">{formatPrice(installment.depositAmount)} down</div>
            </button>
          </div>

          {paymentMode === "installment" && (
            <div className="mt-3 border-t border-border pt-3 space-y-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Down Payment ({installment.depositPercentage}% today):</span>
                  <span className="font-bold text-foreground">{formatPrice(installment.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Remaining Balance:</span>
                  <span className="font-bold text-foreground">{formatPrice(installment.remainingBalance)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold text-foreground">
                  <span>Total Hire Purchase Cost ({installment.profitPercentage}% plan):</span>
                  <span>{formatPrice(installment.totalPrice)}</span>
                </div>
              </div>

              {/* Installment Frequency Option Selector */}
              <div className="border-t border-border/60 pt-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">Choose Payment Frequency</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInstallmentFrequency("monthly")}
                    className={cn(
                      "border p-2 text-left transition-colors rounded-none flex flex-col justify-between h-14",
                      installmentFrequency === "monthly"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-muted-foreground hover:border-foreground/40",
                    )}
                  >
                    <span className="text-[11px] font-bold">Monthly Plan</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      {formatPrice(monthlyRate)} / mo ({monthlyPaymentsCount}x)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentFrequency("weekend")}
                    className={cn(
                      "border p-2 text-left transition-colors rounded-none flex flex-col justify-between h-14",
                      installmentFrequency === "weekend"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white text-muted-foreground hover:border-foreground/40",
                    )}
                  >
                    <span className="text-[11px] font-bold">Weekend Plan</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      {formatPrice(weekendRate)} / wk ({weekendPaymentsCount}x)
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  * Remaining balance of {formatPrice(installment.remainingBalance)} payable over {installment.durationMonths} months as either {monthlyPaymentsCount} monthly payments of {formatPrice(monthlyRate)} or {weekendPaymentsCount} weekend/weekly payments of {formatPrice(weekendRate)}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {storages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground">Storage</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {storages.map((storage) => (
              <button
                key={storage}
                type="button"
                onClick={() => setSelectedStorage(storage)}
                className={cn(
                  "rounded border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedStorage === storage
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/50",
                )}
              >
                {storage}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground">Colour</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "rounded border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedColor === color
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/50",
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedVariant && selectedVariant.price !== product.basePrice && (
        <p className="text-sm font-semibold text-foreground">
          {formatPrice(selectedVariant.price)}
        </p>
      )}

      <div>
        <p className="text-sm font-medium text-foreground">Quantity</p>
        <div className="mt-2 flex w-fit items-center border border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-10 text-center text-sm font-medium text-foreground">{quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-none"
            disabled={quantity >= maxQuantity}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        {!inStock && (
          <p className="mt-1.5 text-xs text-muted-foreground">Currently out of stock.</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-grow rounded-none"
          disabled={!inStock}
          onClick={handleAddToCart}
        >
          <ShoppingBag className="mr-2 size-4" />
          {inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="rounded-none border-border px-4"
          disabled={wishlistLoading}
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("size-4", wishlisted ? "fill-foreground text-foreground" : "text-foreground")} />
        </Button>
      </div>
    </div>
  );
}
