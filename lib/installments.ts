export interface InstallmentConfig {
  profitPercentage: number;  // e.g. 20 for 20%
  depositPercentage: number; // e.g. 40 for 40%
  isEnabled?: boolean;
}

export const DEFAULT_INSTALLMENT_CONFIG: InstallmentConfig = {
  profitPercentage: 20,
  depositPercentage: 40,
  isEnabled: true,
};

export interface InstallmentBreakdown {
  basePrice: number;
  totalPrice: number;
  depositAmount: number;
  remainingBalance: number;
  markupAmount: number;
  profitPercentage: number;
  depositPercentage: number;
}

/**
 * Calculates dynamic deposit & profit installment breakdown.
 * Formula:
 *  Total Installment Price = Base Price * (1 + profitPercentage / 100)
 *  Deposit Amount = Total Installment Price * (depositPercentage / 100)
 *  Remaining Balance = Total Installment Price - Deposit Amount
 */
export function calculateInstallment(
  basePrice: number,
  config: InstallmentConfig = DEFAULT_INSTALLMENT_CONFIG
): InstallmentBreakdown {
  const base = Math.max(0, basePrice);
  const profitRate = (config.profitPercentage ?? 20) / 100;
  const depositRate = (config.depositPercentage ?? 40) / 100;

  const totalPrice = Math.round(base * (1 + profitRate) * 100) / 100;
  const depositAmount = Math.round(totalPrice * depositRate * 100) / 100;
  const remainingBalance = Math.round((totalPrice - depositAmount) * 100) / 100;
  const markupAmount = Math.round((totalPrice - base) * 100) / 100;

  return {
    basePrice: base,
    totalPrice,
    depositAmount,
    remainingBalance,
    markupAmount,
    profitPercentage: config.profitPercentage ?? 20,
    depositPercentage: config.depositPercentage ?? 40,
  };
}
