"use client";

import { useMemo, useState } from "react";
import type { InventoryRowView } from "@/lib/shipping/fetch-shipping";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SelectedLine = { product_id: string; quantity: number };

export function InventoryPicker({
  inventory,
  onChange,
}: {
  inventory: InventoryRowView[];
  onChange: (lines: SelectedLine[]) => void;
}) {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const lines = useMemo(() => {
    return Object.entries(qtyMap)
      .filter(([, q]) => q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
  }, [qtyMap]);

  const sync = (next: Record<string, number>) => {
    setQtyMap(next);
    const selected = Object.entries(next)
      .filter(([, q]) => q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    onChange(selected);
  };

  if (inventory.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        暂无可用专属库存（需老板将订单商品标记为制作完成）
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {inventory.map((row) => (
        <li
          key={row.productId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
        >
          <div>
            <p className="font-medium text-gray-900">{row.productName}</p>
            <p className="text-xs text-gray-500">可用：{row.quantity}</p>
          </div>
          <div className="w-28">
            <Label htmlFor={`qty-${row.productId}`} className="sr-only">
              发货数量
            </Label>
            <Input
              id={`qty-${row.productId}`}
              type="number"
              min={0}
              max={row.quantity}
              value={qtyMap[row.productId] ?? 0}
              onChange={(e) => {
                const v = Math.min(
                  row.quantity,
                  Math.max(0, parseInt(e.target.value, 10) || 0)
                );
                sync({ ...qtyMap, [row.productId]: v });
              }}
            />
          </div>
        </li>
      ))}
      <p className="text-xs text-gray-500">
        已选 {lines.length} 种商品；提交时将立即扣减对应库存
      </p>
    </ul>
  );
}
