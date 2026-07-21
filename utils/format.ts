const GHS_FORMATTER = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return GHS_FORMATTER.format(amount);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-GH", { notation: "compact" }).format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function discountPercent(basePrice: number, compareAtPrice: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= basePrice) return null;
  return Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100);
}
