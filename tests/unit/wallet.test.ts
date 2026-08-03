import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWalletDetails, requestWithdrawal, bindReferralCode } from "@/actions/storefront/wallet";
import { updateWithdrawalStatus, updateReferralRewardSetting } from "@/actions/admin/wallet";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  then: vi.fn() as any,
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockChain),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve({ id: "staff-1", email: "admin@scrinhouse.com" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Referrals, Wallet & Withdrawals Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123", email: "kofi@example.com" } } });
    
    // Reset call implementation of intermediate chains
    mockChain.select.mockReturnValue(mockChain);
    mockChain.insert.mockReturnValue(mockChain);
    mockChain.update.mockReturnValue(mockChain);
    mockChain.upsert.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.in.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    
    // Reset specific terminal resolves
    mockChain.single.mockReset();
    mockChain.maybeSingle.mockReset();
    mockChain.then = undefined as any;
  });

  describe("getWalletDetails (customer)", () => {
    it("provisions a wallet if missing and returns details successfully", async () => {
      // 1. Wallets check (returns null)
      mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // 2. Provision new wallet (returns balance)
      mockChain.single.mockResolvedValueOnce({ data: { balance: 0.00 }, error: null });

      // 3. Profiles query (referral code)
      mockChain.maybeSingle.mockResolvedValueOnce({ data: { referral_code: "KOFICODE" }, error: null });

      // 4. Wallet_transactions (empty)
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      // 5. Withdrawal_requests (empty)
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      const details = await getWalletDetails();

      expect(details.balance).toBe(0);
      expect(details.referralCode).toBe("KOFICODE");
      expect(details.transactions).toHaveLength(0);
      expect(details.withdrawals).toHaveLength(0);
      expect(mockSupabase.from).toHaveBeenCalledWith("wallets");
    });
  });

  describe("requestWithdrawal (customer)", () => {
    it("successfully creates a request if wallet balance is sufficient", async () => {
      // 1. Wallets balance (returns 150 GHS)
      mockChain.single.mockResolvedValueOnce({ data: { balance: 150.00 }, error: null });

      // 2. Pendings check (returns empty list) and Insert request (returns success)
      mockChain.then = vi.fn()
        .mockImplementationOnce((onfulfilled) => onfulfilled({ data: [], error: null }))
        .mockImplementationOnce((onfulfilled) => onfulfilled({ error: null }));

      const res = await requestWithdrawal(100.00, "momo", { provider: "mtn", number: "0551234567", name: "Kofi Mensah" });

      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("withdrawal_requests");
    });

    it("rejects request if balance is insufficient", async () => {
      // 1. Wallets balance (returns 50 GHS)
      mockChain.single.mockResolvedValueOnce({ data: { balance: 50.00 }, error: null });

      // 2. Pendings check (returns empty list)
      mockChain.then = vi.fn()
        .mockImplementationOnce((onfulfilled) => onfulfilled({ data: [], error: null }));

      const res = await requestWithdrawal(100.00, "momo", { provider: "mtn", number: "0551234567", name: "Kofi Mensah" });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Insufficient available balance");
    });
  });

  describe("bindReferralCode (customer)", () => {
    it("successfully updates referred_by if profile exists and code is valid", async () => {
      // 1. User profile query
      mockChain.single.mockResolvedValueOnce({ data: { id: "user-123", referral_code: "MYCODE", referred_by: null }, error: null });

      // 2. Referrer lookup query
      mockChain.maybeSingle.mockResolvedValueOnce({ data: { id: "user-456" }, error: null });

      // 3. Update profiles referred_by field (returns success)
      mockChain.then = vi.fn()
        .mockImplementationOnce((onfulfilled) => onfulfilled({ error: null }));

      const res = await bindReferralCode("KOFICODE");

      expect(res.success).toBe(true);
    });

    it("fails if attempting self-referral", async () => {
      // 1. User profile query
      mockChain.single.mockResolvedValueOnce({ data: { id: "user-123", referral_code: "MYCODE", referred_by: null }, error: null });

      const res = await bindReferralCode("MYCODE");

      expect(res.success).toBe(false);
      expect(res.error).toContain("You cannot refer yourself");
    });
  });

  describe("updateWithdrawalStatus (admin)", () => {
    it("deducts amount and process status to paid successfully", async () => {
      // 1. Payout details check (returns pending request details)
      mockChain.single.mockResolvedValueOnce({ data: { id: "req-1", amount: 100.00, status: "pending", user_id: "user-123", payment_method: "momo" }, error: null });

      // 2. User wallet balance lookup (returns balance = 150 GHS)
      mockChain.single.mockResolvedValueOnce({ data: { balance: 150.00 }, error: null });

      // 3. Chain thenable resolutions (update wallets, insert transaction, update request status)
      mockChain.then = vi.fn()
        .mockImplementationOnce((onfulfilled) => onfulfilled({ error: null }))
        .mockImplementationOnce((onfulfilled) => onfulfilled({ error: null }))
        .mockImplementationOnce((onfulfilled) => onfulfilled({ error: null }));

      const res = await updateWithdrawalStatus("req-1", "paid", "Success payout", "TXN-789", 100.00);

      expect(res.success).toBe(true);
    });
  });
});
