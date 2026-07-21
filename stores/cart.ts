import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  /** Unique key for this line — variantId (or productId if no variants) */
  variantId: string;
  productId: string;
  name: string;
  /** Human-readable label, e.g. "256GB / Midnight" — empty string if N/A */
  variantLabel: string;
  imageUrl: string | null;
  /** Price in GHS cedis at the time of add */
  price: number;
  quantity: number;

  // Installment metadata
  isInstallment?: boolean;
  depositAmount?: number;
  remainingBalance?: number;
  totalInstallmentPrice?: number;
}

interface CartState {
  items: CartItem[];

  // Mutations
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;

  // Derived (computed inline — no selector needed)
  totalItems: () => number;
  subtotal: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(incoming) {
        const qty = incoming.quantity ?? 1;
        set((state) => {
          const existing = state.items.find((i) => i.variantId === incoming.variantId && i.isInstallment === incoming.isInstallment);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === incoming.variantId && i.isInstallment === incoming.isInstallment
                  ? { ...i, quantity: i.quantity + qty }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { ...incoming, quantity: qty }],
          };
        });
      },

      removeItem(variantId) {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }));
      },

      updateQuantity(variantId, quantity) {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i,
          ),
        }));
      },

      clearCart() {
        set({ items: [] });
      },

      totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      subtotal() {
        return get().items.reduce((sum, i) => {
          const unitPrice = (i.isInstallment && i.depositAmount !== undefined) ? i.depositAmount : i.price;
          return sum + unitPrice * i.quantity;
        }, 0);
      },
    }),
    {
      name: "scrinhouse-cart",
      // Only persist the items array — derived methods rehydrate automatically
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
