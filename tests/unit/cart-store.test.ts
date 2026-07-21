import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/stores/cart";

// Reset store between tests
beforeEach(() => {
  useCartStore.setState({ items: [] });
});

const BASE_ITEM = {
  variantId: "v1",
  productId: "p1",
  name: "iPhone 15 Pro",
  variantLabel: "256GB / Black",
  imageUrl: null,
  price: 8500,
};

describe("useCartStore — addItem", () => {
  it("adds a new item with quantity 1 by default", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it("increments quantity when the same variantId is added again", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().addItem({ ...BASE_ITEM, quantity: 2 });
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("adds a second distinct variant as a separate line", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().addItem({ ...BASE_ITEM, variantId: "v2", variantLabel: "512GB / White" });
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe("useCartStore — removeItem", () => {
  it("removes the matching item", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().removeItem("v1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("is a no-op for non-existent variantId", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().removeItem("does-not-exist");
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe("useCartStore — updateQuantity", () => {
  it("updates the quantity for the matching item", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().updateQuantity("v1", 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it("removes the item when quantity is set to 0", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().updateQuantity("v1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removes the item when quantity is negative", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().updateQuantity("v1", -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("useCartStore — clearCart", () => {
  it("empties all items", () => {
    useCartStore.getState().addItem(BASE_ITEM);
    useCartStore.getState().addItem({ ...BASE_ITEM, variantId: "v2" });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("useCartStore — derived values", () => {
  it("totalItems sums quantities across all lines", () => {
    useCartStore.getState().addItem({ ...BASE_ITEM, quantity: 2 });
    useCartStore.getState().addItem({ ...BASE_ITEM, variantId: "v2", quantity: 3 });
    expect(useCartStore.getState().totalItems()).toBe(5);
  });

  it("subtotal multiplies price × quantity for each line and sums", () => {
    useCartStore.getState().addItem({ ...BASE_ITEM, price: 1000, quantity: 2 });
    useCartStore.getState().addItem({ ...BASE_ITEM, variantId: "v2", price: 500, quantity: 3 });
    expect(useCartStore.getState().subtotal()).toBe(3500);
  });

  it("returns 0 for totalItems and subtotal when cart is empty", () => {
    expect(useCartStore.getState().totalItems()).toBe(0);
    expect(useCartStore.getState().subtotal()).toBe(0);
  });
});
