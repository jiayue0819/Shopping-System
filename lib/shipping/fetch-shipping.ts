import { createClient } from "@/lib/supabase/server";
import type { ShippingRequestStatus } from "@/types/database";

export type ShippingItemView = {
  productId: string;
  productName: string;
  quantity: number;
};

export type ShippingRequestView = {
  id: string;
  status: ShippingRequestStatus;
  trackingNumber: string | null;
  customerNote: string | null;
  ownerNote: string | null;
  shippedAt: string | null;
  createdAt: string;
  customerId: string;
  customerName: string;
  items: ShippingItemView[];
};

export type InventoryRowView = {
  productId: string;
  productName: string;
  quantity: number;
};

export async function fetchCustomerInventory(
  shopId: string,
  userId: string
): Promise<InventoryRowView[]> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("inventory")
    .select("product_id, quantity")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });

  const list = (rows ?? []) as { product_id: string; quantity: number }[];
  const result: InventoryRowView[] = [];

  for (const row of list) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", row.product_id)
      .maybeSingle();

    result.push({
      productId: row.product_id,
      productName: (product as { name: string } | null)?.name ?? "商品",
      quantity: row.quantity,
    });
  }

  return result;
}

export async function fetchShopCustomers(shopId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("shop_id", shopId)
    .eq("role", "customer")
    .order("display_name", { ascending: true });

  return (data ?? []) as { id: string; display_name: string | null }[];
}

async function mapRequestItems(
  requestId: string
): Promise<ShippingItemView[]> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("shipping_request_items")
    .select("product_id, quantity")
    .eq("shipping_request_id", requestId);

  const list = (items ?? []) as { product_id: string; quantity: number }[];
  const views: ShippingItemView[] = [];

  for (const item of list) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", item.product_id)
      .maybeSingle();

    views.push({
      productId: item.product_id,
      productName: (product as { name: string } | null)?.name ?? "商品",
      quantity: item.quantity,
    });
  }

  return views;
}

export async function fetchCustomerShippingRequests(
  customerId: string
): Promise<ShippingRequestView[]> {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("shipping_requests")
    .select(
      "id, status, tracking_number, customer_note, owner_note, shipped_at, created_at, customer_id"
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const list = (requests ?? []) as {
    id: string;
    status: ShippingRequestStatus;
    tracking_number: string | null;
    customer_note: string | null;
    owner_note: string | null;
    shipped_at: string | null;
    created_at: string;
    customer_id: string;
  }[];

  const result: ShippingRequestView[] = [];

  for (const req of list) {
    result.push({
      id: req.id,
      status: req.status,
      trackingNumber: req.tracking_number,
      customerNote: req.customer_note,
      ownerNote: req.owner_note,
      shippedAt: req.shipped_at,
      createdAt: req.created_at,
      customerId: req.customer_id,
      customerName: "我",
      items: await mapRequestItems(req.id),
    });
  }

  return result;
}

export async function fetchOwnerShippingRequests(
  shopId: string
): Promise<ShippingRequestView[]> {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("shipping_requests")
    .select(
      "id, status, tracking_number, customer_note, owner_note, shipped_at, created_at, customer_id"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  const list = (requests ?? []) as {
    id: string;
    status: ShippingRequestStatus;
    tracking_number: string | null;
    customer_note: string | null;
    owner_note: string | null;
    shipped_at: string | null;
    created_at: string;
    customer_id: string;
  }[];

  const result: ShippingRequestView[] = [];

  for (const req of list) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", req.customer_id)
      .maybeSingle();

    result.push({
      id: req.id,
      status: req.status,
      trackingNumber: req.tracking_number,
      customerNote: req.customer_note,
      ownerNote: req.owner_note,
      shippedAt: req.shipped_at,
      createdAt: req.created_at,
      customerId: req.customer_id,
      customerName:
        (profile as { display_name: string | null } | null)?.display_name ??
        "客户",
      items: await mapRequestItems(req.id),
    });
  }

  return result;
}
