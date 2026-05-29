import { createClient } from "@/lib/supabase/server";
import {
  getPaymentProofSignedUrl,
  getRefundProofSignedUrl,
} from "@/lib/storage/signed-url";
import type { OrderItemStatus, OrderStatus } from "@/types/database";

export type OrderItemView = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: OrderItemStatus;
  refund: {
    id: string;
    refundProofSignedUrl: string | null;
    ownerReason: string | null;
    customerStatus: string;
  } | null;
};

export type OwnerOrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  customerNote: string | null;
  customerName: string;
  paymentProofSignedUrl: string | null;
  createdAt: string;
  items: OrderItemView[];
};

export type CustomerOrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  customerNote: string | null;
  paymentProofSignedUrl: string | null;
  createdAt: string;
  items: OrderItemView[];
};

export async function fetchOwnerOrders(shopId: string): Promise<OwnerOrderView[]> {
  const supabase = await createClient();

  const { data: rawOrders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total_amount, customer_note, payment_proof_url, created_at, customer_id"
    )
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  const orders = (rawOrders ?? []) as {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    customer_note: string | null;
    payment_proof_url: string | null;
    created_at: string;
    customer_id: string;
  }[];

  const result: OwnerOrderView[] = [];

  for (const order of orders) {
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", order.customer_id)
      .maybeSingle();

    const customerName =
      (customerProfile as { display_name: string | null } | null)
        ?.display_name ?? "客户";

    const items = await fetchOrderItems(order.id);
    result.push({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalAmount: Number(order.total_amount),
      customerNote: order.customer_note,
      customerName,
      paymentProofSignedUrl: await getPaymentProofSignedUrl(
        order.payment_proof_url
      ),
      createdAt: order.created_at,
      items,
    });
  }

  return result;
}

export async function fetchCustomerOrders(
  customerId: string
): Promise<CustomerOrderView[]> {
  const supabase = await createClient();

  const { data: rawOrders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total_amount, customer_note, payment_proof_url, created_at"
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const orders = (rawOrders ?? []) as {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    customer_note: string | null;
    payment_proof_url: string | null;
    created_at: string;
  }[];

  const result: CustomerOrderView[] = [];

  for (const order of orders) {
    const items = await fetchOrderItems(order.id);
    result.push({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalAmount: Number(order.total_amount),
      customerNote: order.customer_note,
      paymentProofSignedUrl: await getPaymentProofSignedUrl(
        order.payment_proof_url
      ),
      createdAt: order.created_at,
      items,
    });
  }

  return result;
}

async function fetchOrderItems(orderId: string): Promise<OrderItemView[]> {
  const supabase = await createClient();

  const { data: rawItems } = await supabase
    .from("order_items")
    .select("id, product_id, quantity, unit_price, subtotal, status")
    .eq("order_id", orderId);

  const items = (rawItems ?? []) as {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    status: OrderItemStatus;
  }[];

  const views: OrderItemView[] = [];

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", item.product_id)
      .maybeSingle();

    const { data: refundRaw } = await supabase
      .from("refund_records")
      .select("id, refund_proof_url, owner_reason, customer_status")
      .eq("order_item_id", item.id)
      .maybeSingle();

    let refund: OrderItemView["refund"] = null;

    if (refundRaw) {
      const r = refundRaw as {
        id: string;
        refund_proof_url: string;
        owner_reason: string | null;
        customer_status: string;
      };
      refund = {
        id: r.id,
        refundProofSignedUrl: await getRefundProofSignedUrl(r.refund_proof_url),
        ownerReason: r.owner_reason,
        customerStatus: r.customer_status,
      };
    }

    views.push({
      id: item.id,
      productId: item.product_id,
      productName: (product as { name: string } | null)?.name ?? "商品",
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      status: item.status,
      refund,
    });
  }

  return views;
}
