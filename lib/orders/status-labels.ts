import type { OrderStatus } from "@/types/database";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "待付款",
  pending_review: "待确认",
  approved: "已通过",
  rejected: "已拒绝",
  cancelled: "已取消",
};
