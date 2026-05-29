/**
 * Supabase 数据库类型占位。
 * 执行 schema.sql 后，可用 CLI 生成完整类型：
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type UserRole = "owner" | "customer";

export type OrderStatus =
  | "pending_payment"
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type OrderItemStatus =
  | "pending_review"
  | "in_production"
  | "stocked"
  | "refund_pending"
  | "refunded";

export type RefundCustomerStatus = "pending" | "confirmed" | "disputed";

export type ShippingRequestStatus = "waiting" | "shipped";

export type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      shops: TableDef<{
        id: string;
        owner_id: string;
        name: string;
        description: string | null;
        invite_code: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      profiles: TableDef<{
        id: string;
        shop_id: string;
        role: UserRole;
        display_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }>;
      products: TableDef<ProductRow>;
      orders: TableDef<{
        id: string;
        shop_id: string;
        customer_id: string;
        order_number: string;
        status: OrderStatus;
        total_amount: number;
        payment_proof_url: string | null;
        customer_note: string | null;
        owner_note: string | null;
        reviewed_at: string | null;
        reviewed_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      order_items: TableDef<{
        id: string;
        order_id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
        status: OrderItemStatus;
        owner_note: string | null;
        created_at: string;
        updated_at: string;
      }>;
      inventory: TableDef<{
        id: string;
        shop_id: string;
        user_id: string;
        product_id: string;
        quantity: number;
        created_at: string;
        updated_at: string;
      }>;
      refund_records: TableDef<{
        id: string;
        shop_id: string;
        order_item_id: string;
        owner_id: string;
        customer_id: string;
        refund_proof_url: string;
        owner_reason: string | null;
        customer_status: RefundCustomerStatus;
        customer_confirmed_at: string | null;
        customer_note: string | null;
        created_at: string;
        updated_at: string;
      }>;
      shipping_requests: TableDef<{
        id: string;
        shop_id: string;
        customer_id: string;
        status: ShippingRequestStatus;
        tracking_number: string | null;
        customer_note: string | null;
        owner_note: string | null;
        shipped_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      shipping_request_items: TableDef<{
        id: string;
        shipping_request_id: string;
        product_id: string;
        quantity: number;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      lookup_shop_by_invite_code: {
        Args: { p_code: string };
        Returns: { id: string; name: string }[];
      };
      generate_order_number: {
        Args: { p_shop_id: string };
        Returns: string;
      };
      complete_order_item_stock: {
        Args: { p_order_item_id: string };
        Returns: undefined;
      };
      create_shipping_request: {
        Args: {
          p_customer_id: string;
          p_customer_note: string;
          p_owner_note: string;
          p_items: { product_id: string; quantity: number }[];
        };
        Returns: string;
      };
      ship_shipping_request: {
        Args: {
          p_request_id: string;
          p_tracking_number: string;
          p_owner_note: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      order_item_status: OrderItemStatus;
      refund_customer_status: RefundCustomerStatus;
      shipping_request_status: ShippingRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
