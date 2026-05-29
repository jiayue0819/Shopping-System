"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InventoryRowView } from "@/lib/shipping/fetch-shipping";
import { ShippingApplyForm } from "@/components/shipping/shipping-apply-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function OwnerShippingApplySection({
  customers,
  inventoryByCustomer,
}: {
  customers: { id: string; display_name: string | null }[];
  inventoryByCustomer: Record<string, InventoryRowView[]>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");

  const inventory = selectedId ? inventoryByCustomer[selectedId] ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="pick-customer">选择客户库存</Label>
          <select
            id="pick-customer"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
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
        {selectedId && (
          <Button type="button" variant="secondary" onClick={() => router.refresh()}>
            刷新库存
          </Button>
        )}
      </div>

      {selectedId ? (
        <ShippingApplyForm
          inventory={inventory}
          role="owner"
          customers={customers}
          defaultCustomerId={selectedId}
        />
      ) : (
        <p className="text-sm text-gray-500">请先选择客户以加载其专属库存</p>
      )}
    </div>
  );
}
