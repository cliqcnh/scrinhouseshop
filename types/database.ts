/**
 * Hand-authored mirror of the Supabase schema defined in
 * supabase/migrations/*.sql. Once the project is linked to a real Supabase
 * instance, regenerate this file with:
 *
 *   npx supabase gen types typescript --linked > types/database.ts
 *
 * Keep it in sync manually until then.
 */

export type AccountStatus = "active" | "suspended" | "banned";
export type ProductType = "phone" | "accessory" | "repair_part";
export type ProductCondition = "brand_new" | "uk_used";
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_staff: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["roles"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["permissions"]["Row"]> & {
          code: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<{ role_id: string; permission_id: string }>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role_id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          status: AccountStatus;
          loyalty_points: number;
          referral_code: string | null;
          referred_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          role_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["brands"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["brands"]["Row"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["suppliers"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          brand_id: string | null;
          supplier_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          product_type: ProductType;
          condition: ProductCondition | null;
          sku: string;
          barcode: string | null;
          base_price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          tags: string[];
          is_featured: boolean;
          is_active: boolean;
          seo_title: string | null;
          seo_description: string | null;
          avg_rating: number;
          review_count: number;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]> & {
          category_id: string;
          name: string;
          slug: string;
          product_type: ProductType;
          sku: string;
          base_price: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          storage: string | null;
          color: string | null;
          price: number;
          compare_at_price: number | null;
          stock_quantity: number;
          low_stock_threshold: number;
          weight_grams: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_variants"]["Row"]> & {
          product_id: string;
          sku: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Row"]>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          url: string;
          alt_text: string | null;
          display_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_images"]["Row"]> & {
          product_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Row"]>;
        Relationships: [];
      };
      product_videos: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          title: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_videos"]["Row"]> & {
          product_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_videos"]["Row"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          profile_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          is_verified_purchase: boolean;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]> & {
          product_id: string;
          profile_id: string;
          rating: number;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: OrderStatus;
          delivery_address: Record<string, unknown>;
          subtotal: number;
          delivery_fee: number;
          total: number;
          paystack_ref: string | null;
          paystack_channel: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: OrderStatus;
          delivery_address: Record<string, unknown>;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          paystack_ref?: string | null;
          paystack_channel?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          variant_id: string | null;
          product_id: string | null;
          product_name: string;
          variant_label: string | null;
          sku: string;
          image_url: string | null;
          price: number;
          quantity: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          variant_id?: string | null;
          product_id?: string | null;
          product_name: string;
          variant_label?: string | null;
          sku: string;
          image_url?: string | null;
          price: number;
          quantity: number;
          subtotal: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Relationships: [];
      };
      home_slides: {
        Row: {
          id: string;
          image_url: string;
          title: string | null;
          subtitle: string | null;
          link_url: string;
          button_text: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          title?: string | null;
          subtitle?: string | null;
          link_url?: string;
          button_text?: string;
          display_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["home_slides"]["Row"]>;
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["wishlist_items"]["Row"]>;
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          region: string;
          city: string;
          landmark: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          region: string;
          city: string;
          landmark?: string | null;
          is_default?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["addresses"]["Row"]>;
        Relationships: [];
      };
      warranties: {
        Row: {
          id: string;
          order_item_id: string | null;
          product_id: string;
          user_id: string | null;
          imei_serial: string;
          customer_name: string;
          customer_phone: string;
          status: string;
          starts_at: string;
          ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_item_id?: string | null;
          product_id: string;
          user_id?: string | null;
          imei_serial: string;
          customer_name: string;
          customer_phone: string;
          status?: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["warranties"]["Row"]>;
        Relationships: [];
      };
      repair_estimates: {
        Row: {
          id: string;
          device_model: string;
          service_type: string;
          price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_model: string;
          service_type: string;
          price: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["repair_estimates"]["Row"]>;
        Relationships: [];
      };
      repair_bookings: {
        Row: {
          id: string;
          user_id: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          device_model: string;
          service_type: string;
          issue_description: string;
          estimated_amount: number;
          status: string;
          delivery_method: string;
          pickup_address: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          device_model: string;
          service_type: string;
          issue_description: string;
          estimated_amount: number;
          status?: string;
          delivery_method?: string;
          pickup_address?: any | null;
        };
        Update: Partial<Database["public"]["Tables"]["repair_bookings"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_status: AccountStatus;
      product_type: ProductType;
      product_condition: ProductCondition;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
