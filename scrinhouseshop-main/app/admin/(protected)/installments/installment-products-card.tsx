"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Search, Save, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listProductsForInstallments,
  updateProductInstallmentConfig,
  type ProductInstallmentConfigRow,
} from "@/actions/admin/installments";

const PRODUCT_TYPES = [
  { id: "phone", label: "Phones" },
  { id: "laptop_tablet", label: "Laptops & Tablets" },
  { id: "gaming", label: "Gaming Consoles" },
  { id: "accessory", label: "Accessories" },
  { id: "repair_part", label: "Repair Parts" },
];

function getProductGroup(p: ProductInstallmentConfigRow): "phone" | "laptop_tablet" | "gaming" | "accessory" | "repair_part" {
  const slug = p.categorySlug || "";
  const name = p.name.toLowerCase();

  // 1. Repair Parts
  if (
    p.productType === "repair_part" ||
    slug.includes("batteries") ||
    slug.includes("repairs") ||
    name.includes("replacement") ||
    name.includes("screen") ||
    name.includes("battery")
  ) {
    return "repair_part";
  }

  // 2. Laptops & Tablets
  if (
    slug === "laptops" ||
    slug === "tablets-ipads" ||
    name.includes("macbook") ||
    name.includes("ipad") ||
    name.includes("laptop") ||
    name.includes("tablet")
  ) {
    return "laptop_tablet";
  }

  // 3. Gaming Consoles
  if (
    slug === "gaming-consoles" ||
    name.includes("playstation") ||
    name.includes("xbox") ||
    name.includes("nintendo") ||
    name.includes("console")
  ) {
    return "gaming";
  }

  // 4. Accessories
  if (
    p.productType === "accessory" ||
    slug === "accessories" ||
    slug === "cases-protection" ||
    slug === "power-banks" ||
    slug === "chargers" ||
    slug === "audio"
  ) {
    return "accessory";
  }

  // 5. Phones (Default)
  return "phone";
}

export function InstallmentProductsCard() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductInstallmentConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phone" | "laptop_tablet" | "gaming" | "accessory" | "repair_part">("phone");

  // Local form states per product row
  const [rowStates, setRowStates] = useState<
    Record<
      string,
      {
        allowInstallments: boolean;
        profitPercentage: string;
        depositPercentage: string;
      }
    >
  >({});

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const items = await listProductsForInstallments(search);
        setProducts(items);

        // Initialize row states
        const states: typeof rowStates = {};
        for (const item of items) {
          states[item.id] = {
            allowInstallments: item.allowInstallments,
            profitPercentage: item.installmentProfitPercentage !== null ? String(item.installmentProfitPercentage) : "",
            depositPercentage: item.installmentDepositPercentage !== null ? String(item.installmentDepositPercentage) : "",
          };
        }
        setRowStates(states);
      } catch {
        toast.error("Failed to load products settings.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [search]);

  function handleStateChange(
    id: string,
    key: "allowInstallments" | "profitPercentage" | "depositPercentage",
    value: boolean | string
  ) {
    setRowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  }

  async function handleSaveRow(id: string) {
    const state = rowStates[id];
    if (!state) return;

    const profit = state.profitPercentage === "" ? null : Number(state.profitPercentage);
    const deposit = state.depositPercentage === "" ? null : Number(state.depositPercentage);

    if (profit !== null && (profit < 0 || profit > 100)) {
      toast.error("Profit Markup must be between 0% and 100%.");
      return;
    }
    if (deposit !== null && (deposit <= 0 || deposit > 100)) {
      toast.error("Deposit must be between 1% and 100%.");
      return;
    }

    setSavingId(id);
    try {
      const res = await updateProductInstallmentConfig(
        id,
        state.allowInstallments,
        profit,
        deposit
      );
      if (!res.success) {
        toast.error(res.error ?? "Failed to save product settings.");
        return;
      }
      toast.success("Product installment configuration updated!");
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setSavingId(null);
    }
  }

  const filteredProducts = products.filter((p) => getProductGroup(p) === activeTab);

  return (
    <div className="border border-border p-6 bg-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <Package className="size-4 text-foreground" /> Configured Products & Overrides
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn installments on/off or set custom deposit/profit markup rates on individual products.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border pl-9 pr-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none rounded-none"
          />
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex gap-2 border-b border-border -mt-2">
        {PRODUCT_TYPES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "phone" | "laptop_tablet" | "gaming" | "accessory" | "repair_part")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all rounded-none -mb-[1px] ${
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-xs font-semibold uppercase tracking-wider gap-2">
          <Loader2 className="size-4 animate-spin text-foreground" /> Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          No products found in this category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 w-40">Allow Plan</th>
                <th className="py-3 px-4 w-44">Custom Profit Markup %</th>
                <th className="py-3 px-4 w-44">Custom Deposit %</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((p) => {
                const state = rowStates[p.id] || {
                  allowInstallments: false,
                  profitPercentage: "",
                  depositPercentage: "",
                };

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {p.name}
                      <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                        SKU: {p.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {p.categoryName || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                        <input
                          type="checkbox"
                          checked={state.allowInstallments}
                          onChange={(e) =>
                            handleStateChange(p.id, "allowInstallments", e.target.checked)
                          }
                          className="size-4 rounded border-border text-foreground focus:ring-foreground"
                        />
                        Enabled
                      </label>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Store default"
                          value={state.profitPercentage}
                          disabled={!state.allowInstallments}
                          onChange={(e) =>
                            handleStateChange(p.id, "profitPercentage", e.target.value)
                          }
                          className="w-full border border-border px-2 py-1 text-xs text-foreground focus:border-foreground focus:outline-none rounded-none pr-6 font-mono disabled:opacity-50"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground font-bold">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Store default"
                          value={state.depositPercentage}
                          disabled={!state.allowInstallments}
                          onChange={(e) =>
                            handleStateChange(p.id, "depositPercentage", e.target.value)
                          }
                          className="w-full border border-border px-2 py-1 text-xs text-foreground focus:border-foreground focus:outline-none rounded-none pr-6 font-mono disabled:opacity-50"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground font-bold">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        onClick={() => handleSaveRow(p.id)}
                        disabled={savingId === p.id}
                        className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-[10px] font-semibold uppercase tracking-wider gap-1 py-1.5 px-3 h-auto"
                      >
                        {savingId === p.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Save className="size-3" />
                        )}
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
