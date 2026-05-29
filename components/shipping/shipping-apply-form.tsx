"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createShippingRequestAction } from "@/lib/actions/shipping";
import type { ActionResult } from "@/lib/auth/actions";
import type { InventoryRowView } from "@/lib/shipping/fetch-shipping";
import {
  InventoryPicker,
  type SelectedLine,
} from "@/components/shipping/inventory-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const initial: ActionResult = {};

export function ShippingApplyForm({
  inventory,
  role,
  customers,
  defaultCustomerId,
}: {
  inventory: InventoryRowView[];
  role: "customer" | "owner";
  customers?: { id: string; display_name: string | null }[];
  defaultCustomerId?: string;
}) {
  const [state, formAction] = useFormState(createShippingRequestAction, initial);
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");

  const canSubmit = lines.length > 0 && (role === "customer" || Boolean(customerId));

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">申请发货</h2>
      <p className="text-sm text-gray-500">
        从专属库存勾选商品；提交瞬间将扣减库存，状态为「等待发货」
      </p>

      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}

      {role === "owner" && defaultCustomerId && (
        <input type="hidden" name="customer_id" value={defaultCustomerId} />
      )}

      {role === "owner" && customers && !defaultCustomerId && (
        <div>
          <Label htmlFor="customer_id">客户</Label>
          <select
            id="customer_id"
            name="customer_id"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">请选择客户</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name ?? c.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <input type="hidden" name="items_json" value={JSON.stringify(lines)} readOnly />

      <InventoryPicker inventory={inventory} onChange={setLines} />

      <div>
        <Label htmlFor="customer_note">备注</Label>
        <textarea
          id="customer_note"
          name="customer_note"
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          placeholder={role === "owner" ? "客户侧备注（可选）" : "收货地址、联系人等"}
        />
      </div>

      {role === "owner" && (
        <div>
          <Label htmlFor="owner_note">老板备注（可选）</Label>
          <textarea
            id="owner_note"
            name="owner_note"
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        提交发货申请（即时扣减库存）
      </Button>
    </form>
  );
}
