import type { OrderItemStatus } from "@/types/database";

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending_review: "待审核",
  in_production: "制作中",
  stocked: "已入库",
  refund_pending: "待确认退款",
  refunded: "已退款",
};
