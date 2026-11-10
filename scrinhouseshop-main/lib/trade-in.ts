export interface TradeInInput {
  brand: string;
  model: string;
  storage: string;
  screenCondition: "flawless" | "scratched" | "cracked";
  bodyCondition: "clean" | "light_wear" | "heavy_wear";
  batteryHealth: "good" | "below_80";
}

const BASE_MODEL_VALUES: Record<string, number> = {
  "iPhone 11": 2200,
  "iPhone 11 Pro": 2800,
  "iPhone 11 Pro Max": 3200,
  "iPhone 12": 3500,
  "iPhone 12 Pro": 4200,
  "iPhone 12 Pro Max": 4800,
  "iPhone 13": 4800,
  "iPhone 13 Pro": 5800,
  "iPhone 13 Pro Max": 6500,
  "iPhone 14": 6500,
  "iPhone 14 Pro": 7800,
  "iPhone 14 Pro Max": 8800,
  "iPhone 15": 8500,
  "iPhone 15 Pro": 10500,
  "iPhone 15 Pro Max": 12000,
  "Galaxy S21": 2800,
  "Galaxy S22": 3800,
  "Galaxy S23": 5200,
  "Galaxy S24": 6800,
};

export function calculateTradeInValue(input: TradeInInput): number {
  let base = BASE_MODEL_VALUES[input.model] ?? 3000;

  // Storage multiplier
  if (input.storage === "256GB") base *= 1.1;
  if (input.storage === "512GB" || input.storage === "1TB") base *= 1.25;

  // Screen condition
  if (input.screenCondition === "scratched") base *= 0.85;
  if (input.screenCondition === "cracked") base *= 0.60;

  // Body condition
  if (input.bodyCondition === "light_wear") base *= 0.92;
  if (input.bodyCondition === "heavy_wear") base *= 0.80;

  // Battery health
  if (input.batteryHealth === "below_80") base *= 0.88;

  return Math.round(base / 50) * 50; // Round to nearest GHS 50
}
