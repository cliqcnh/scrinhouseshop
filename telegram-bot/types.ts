export interface TelegramAuctionUser {
  id: string;
  user_id: string | null;
  telegram_id: number;
  telegram_username: string | null;
  full_name: string;
  phone: string;
  bidder_id: string;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface TelegramAuction {
  id: string;
  auction_number: string;
  product_id: string | null;
  title: string;
  description: string | null;
  starting_price: number;
  minimum_increment: number;
  current_bid: number;
  current_bidder_id: string | null;
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "paused" | "ended" | "cancelled";
  anti_snipe_enabled: boolean;
  extension_minutes: number;
  created_at: string;
  updated_at: string;
  current_bidder?: TelegramAuctionUser | null;
  products?: {
    name: string;
    description: string | null;
    condition: string | null;
    base_price: number;
  } | null;
}

export interface TelegramAuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  bidder?: TelegramAuctionUser | null;
  auction?: TelegramAuction | null;
}

export interface TelegramAuctionWinner {
  id: string;
  auction_id: string;
  bidder_id: string | null;
  winning_amount: number;
  order_id: string | null;
  payment_status: "pending_payment" | "paid" | "cancelled";
  created_at: string;
  auction?: TelegramAuction | null;
  bidder?: TelegramAuctionUser | null;
}
