"use client";

import { useTransition } from "react";
import { confirmRefundAction } from "@/lib/actions/customer-orders";
import type { OrderItemView } from "@/lib/orders/fetch-orders";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/orders/item-status-labels";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useState } from "react";

export function CustomerOrderItems({ items }: { items: OrderItemView[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <li className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        商品明细
      </li>
      {items.map((item) => (
        <CustomerOrderItemRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function CustomerOrderItemRow({ item }: { item: OrderItemView }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; success?: string }>(
    {}
  );

  const showConfirmRefund =
    item.status === "refund_pending" &&
    item.refund &&
    item.refund.customerStatus === "pending";

  return (
    <li className="rounded-lg bg-gray-50 p-3 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium text-gray-900">
          {item.productName} × {item.quantity}
        </span>
        <span className="text-gray-600">
          {ORDER_ITEM_STATUS_LABELS[item.status]}
        </span>
      </div>
      <p className="mt-1 text-gray-500">¥{item.subtotal.toFixed(2)}</p>

      {item.refund && (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
          <p className="font-medium text-amber-900">老板退款记录</p>
          {item.refund.ownerReason && (
            <p className="mt-1 text-amber-800">{item.refund.ownerReason}</p>
          )}
          {item.refund.refundProofSignedUrl && (
            <a
              href={item.refund.refundProofSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-indigo-600 hover:underline"
            >
              查看退款截图
            </a>
          )}
          {showConfirmRefund && (
            <div className="mt-3">
              {message.error && <Alert type="error" message={message.error} />}
              {message.success && (
                <Alert type="success" message={message.success} />
              )}
              <Button
                type="button"
                className="mt-2"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await confirmRefundAction(item.refund!.id);
                    setMessage(res);
                  });
                }}
              >
                {pending ? "提交中…" : "确认收到退款"}
              </Button>
            </div>
          )}
          {item.refund.customerStatus === "confirmed" && (
            <p className="mt-2 text-green-700">退款已确认，流程已闭环</p>
          )}
        </div>
      )}
    </li>
  );
}
