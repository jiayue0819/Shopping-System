import type { ShippingRequestStatus } from "@/types/database";

export const SHIPPING_STATUS_LABELS: Record<ShippingRequestStatus, string> = {
  waiting: "等待发货",
  shipped: "已发货",
};
