"use client";

import { useState, useTransition } from "react";
import { useFormState } from "react-dom";
import {
  approveOrderAction,
  completeOrderItemAction,
  rejectOrderItemAction,
} from "@/lib/actions/owner-orders";
import type { ActionResult } from "@/lib/auth/actions";
import type { OrderItemView } from "@/lib/orders/fetch-orders";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/orders/item-status-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const rejectInitial: ActionResult = {};

export function ApproveOrderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionResult>({});

  return (
    <div>
      {message.error && <Alert type="error" message={message.error} />}
      {message.success && <Alert type="success" message={message.success} />}
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await approveOrderAction(orderId);
            setMessage(res);
          });
        }}
      >
        {pending ? "处理中…" : "接单审批（通过付款）"}
      </Button>
    </div>
  );
}

function RejectItemForm({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(rejectOrderItemAction, rejectInitial);

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        拒绝制作
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
      <input type="hidden" name="order_item_id" value={itemId} />
      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}
      <div className="space-y-2">
        <div>
          <Label htmlFor={`reason-${itemId}`}>拒绝原因（可选）</Label>
          <Input id={`reason-${itemId}`} name="owner_reason" />
        </div>
        <div>
          <Label htmlFor={`refund-${itemId}`}>
            退款记录截图 <span className="text-red-600">*</span>
          </Label>
          <Input
            id={`refund-${itemId}`}
            name="refund_proof"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="danger">
            确认拒绝并上传凭证
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            取消
          </Button>
        </div>
      </div>
    </form>
  );
}

export function OwnerOrderItemRow({ item }: { item: OrderItemView }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<ActionResult>({});

  const canComplete = item.status === "in_production";
  const canReject = ["pending_review", "in_production"].includes(item.status);

  return (
    <li className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">
            {item.productName} × {item.quantity}
          </p>
          <p className="text-sm text-gray-500">
            ¥{item.subtotal.toFixed(2)} ·{" "}
            {ORDER_ITEM_STATUS_LABELS[item.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canComplete && (
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await completeOrderItemAction(item.id);
                  setMessage(res);
                });
              }}
            >
              {pending ? "入库中…" : "制作完成"}
            </Button>
          )}
          {canReject && <RejectItemForm itemId={item.id} />}
        </div>
      </div>
      {message.error && (
        <div className="mt-2">
          <Alert type="error" message={message.error} />
        </div>
      )}
      {message.success && (
        <div className="mt-2">
          <Alert type="success" message={message.success} />
        </div>
      )}
      {item.refund && (
        <p className="mt-2 text-xs text-amber-700">
          退款待客户确认
          {item.refund.ownerReason ? `：${item.refund.ownerReason}` : ""}
        </p>
      )}
    </li>
  );
}
