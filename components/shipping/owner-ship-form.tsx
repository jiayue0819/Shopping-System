"use client";

import { useFormState } from "react-dom";
import { shipShippingRequestAction } from "@/lib/actions/shipping";
import type { ActionResult } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const initial: ActionResult = {};

export function OwnerShipForm({ requestId }: { requestId: string }) {
  const [state, formAction] = useFormState(shipShippingRequestAction, initial);

  return (
    <form
      action={formAction}
      className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4"
    >
      <input type="hidden" name="request_id" value={requestId} />
      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}
      <p className="text-sm font-medium text-indigo-900">打包完成 · 填写物流单号</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`tracking-${requestId}`}>物流单号 *</Label>
          <Input
            id={`tracking-${requestId}`}
            name="tracking_number"
            required
            placeholder="SF1234567890"
          />
        </div>
        <div>
          <Label htmlFor={`onote-${requestId}`}>发货备注（可选）</Label>
          <Input id={`onote-${requestId}`} name="owner_note" />
        </div>
      </div>
      <Button type="submit" className="mt-3">
        确认已发货
      </Button>
    </form>
  );
}
