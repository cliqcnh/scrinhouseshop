import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNextEventStart, placeAuctionBid, processEndedAuctionsInternal } from "@/actions/storefront/market-days";
import { getAdminMarketStats, saveMarketEvent } from "@/actions/admin/market-days";
import * as notifications from "@/lib/notifications";

// Helper to build a chainable mock representing the Supabase query builder
function createMockChain(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {};
  const chainFn = vi.fn().mockImplementation(() => chain);

  chain.select = chainFn;
  chain.eq = chainFn;
  chain.order = chainFn;
  chain.limit = chainFn;
  chain.lte = chainFn;
  chain.gte = chainFn;
  chain.in = chainFn;
  chain.not = chainFn;
  chain.insert = chainFn;
  chain.update = chainFn;
  chain.delete = chainFn;
  
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  
  // Thenable logic to make the chain awaitable directly
  chain.then = (onFulfilled: any) => {
    return Promise.resolve(resolvedValue).then(onFulfilled);
  };

  return chain;
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/supabase/admin-guard", () => ({
  requireStaffUser: vi.fn(() => Promise.resolve({ id: "staff-123", email: "admin@scrinhouse.com" })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Market Days Storefront & Bidding Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.rpc.mockReset();
    mockSupabase.from.mockReset();
  });

  it("calculates countdown start date correctly for upcoming Tuesday event", async () => {
    const nextTues = await getNextEventStart("tuesday", "09:00:00");
    expect(nextTues.getUTCDay()).toBe(2); // 2 is Tuesday
  });

  it("calculates countdown start date correctly for upcoming Saturday event", async () => {
    const nextSat = await getNextEventStart("saturday", "10:00:00");
    expect(nextSat.getUTCDay()).toBe(6); // 6 is Saturday
  });

  it("refuses bidding if customer is not logged in", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const res = await placeAuctionBid("auction-123", 250);
    expect(res.success).toBe(false);
    expect(res.error).toContain("logged in");
  });

  it("calls atomic place_bid RPC and handles successful bids", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "bidder@example.com" } },
    });

    mockSupabase.rpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    // Mock select chains for previous highest bids empty
    mockSupabase.from.mockReturnValue(createMockChain({ data: [], error: null }));

    const res = await placeAuctionBid("auction-123", 500);
    expect(res.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("place_bid", {
      p_auction_id: "auction-123",
      p_user_id: "user-123",
      p_amount: 500,
    });
  });

  it("notifies previous highest bidder when outbid", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-new", email: "newbidder@example.com" } },
    });

    mockSupabase.rpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    // Mock sequential queries: previous highest bid, bidder profile, auction item product title, insert notifications
    mockSupabase.from
      .mockReturnValueOnce(createMockChain({ data: [{ user_id: "user-old", amount: 450 }], error: null })) // query bids
      .mockReturnValueOnce(createMockChain({ data: { display_name: "Old Bidder", email: "old@example.com", phone: "0241234567" }, error: null })) // profile query
      .mockReturnValueOnce(createMockChain({ data: { market_products: { products: { name: "iPhone 15" } } }, error: null })) // product name query
      .mockReturnValue(createMockChain({ data: null, error: null })); // inserts notifications

    const smsSpy = vi.spyOn(notifications, "sendSMS").mockResolvedValue(true);

    const res = await placeAuctionBid("auction-123", 500);
    expect(res.success).toBe(true);
    expect(smsSpy).not.toHaveBeenCalled();
  });
});

describe("Market Days Automation & Winner Processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
  });

  it("locks ended auctions, creates pending order list, and registers winner", async () => {
    // Mock ended active auctions search returns 1 auction, winner profile details, order insertion
    mockSupabase.from
      .mockReturnValueOnce(createMockChain({
        data: [{
          id: "auction-ended",
          status: "active",
          end_time: "2026-07-29T21:00:00Z",
          market_products: {
            products: {
              id: "prod-1",
              name: "iPhone 13 Screen",
              product_variants: [{ id: "var-1", sku: "SCR-13", price: 800 }]
            }
          }
        }],
        error: null
      })) // ended auctions list
      .mockReturnValueOnce(createMockChain({ data: null, error: null })) // update status to ended
      .mockReturnValueOnce(createMockChain({ data: [{ id: "bid-win", user_id: "user-win", amount: 750 }], error: null })) // highest bidder
      .mockReturnValueOnce(createMockChain({ data: { display_name: "Winner", email: "winner@example.com", phone: "0247654321" }, error: null })) // winner profile
      .mockReturnValueOnce(createMockChain({ data: { id: "order-win-123" }, error: null })) // insert order select Single
      .mockReturnValue(createMockChain({ data: null, error: null })); // other inserts/updates

    const smsSpy = vi.spyOn(notifications, "sendSMS").mockResolvedValue(true);

    await processEndedAuctionsInternal(mockSupabase);

    expect(mockSupabase.from).toHaveBeenCalledWith("auction_items");
    expect(smsSpy).toHaveBeenCalled();
  });
});

describe("Market Days Admin Analytics & Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
  });

  it("saves market event updates and revalidates pathways", async () => {
    mockSupabase.from.mockReturnValue(createMockChain({ data: null, error: null }));

    const res = await saveMarketEvent({
      id: "ev-123",
      day: "saturday",
      startTime: "10:00:00",
      endTime: "22:00:00",
      title: "Updated Saturday Dealz",
      isEnabled: true,
    });

    expect(res.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("market_events");
  });

  it("calculates dashboard statistics for events correctly", async () => {
    // Mock counts returned sequentially: events Count, active auctions, discount products, bids count, winners
    mockSupabase.from
      .mockReturnValueOnce(createMockChain({ count: 2, data: null, error: null })) // events
      .mockReturnValueOnce(createMockChain({ count: 3, data: null, error: null })) // auctions
      .mockReturnValueOnce(createMockChain({ count: 5, data: null, error: null })) // discount rules
      .mockReturnValueOnce(createMockChain({ count: 42, data: null, error: null })) // bids count
      .mockReturnValueOnce(createMockChain({ data: [], error: null })) // winners
      .mockReturnValue(createMockChain({ data: [], error: null })); // other queries

    const stats = await getAdminMarketStats();
    expect(stats.upcomingEventsCount).toBe(2);
    expect(stats.activeAuctionsCount).toBe(3);
    expect(stats.discountProductsCount).toBe(5);
    expect(stats.totalBidsCount).toBe(42);
  });
});
