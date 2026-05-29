import { requireOwner } from "@/lib/auth/session";
import {
  fetchCustomerInventory,
  fetchOwnerShippingRequests,
  fetchShopCustomers,
} from "@/lib/shipping/fetch-shipping";
import { SHIPPING_STATUS_LABELS } from "@/lib/shipping/status-labels";
import { OwnerShippingApplySection } from "@/components/shipping/owner-shipping-apply-section";
import { OwnerShipForm } from "@/components/shipping/owner-ship-form";

export default async function OwnerShippingPage() {
  const { profile } = await requireOwner();

  const customers = await fetchShopCustomers(profile.shop_id);
  const requests = await fetchOwnerShippingRequests(profile.shop_id);

  const inventoryByCustomer: Record<
    string,
    Awaited<ReturnType<typeof fetchCustomerInventory>>
  > = {};

  for (const c of customers) {
    inventoryByCustomer[c.id] = await fetchCustomerInventory(
      profile.shop_id,
      c.id
    );
  }

  const waiting = requests.filter((r) => r.status === "waiting");
  const shipped = requests.filter((r) => r.status === "shipped");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">发货管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          代客申请发货、处理等待发货记录、回填物流单号
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-lg font-semibold">代客申请发货</h2>
        <OwnerShippingApplySection
          customers={customers}
          inventoryByCustomer={inventoryByCustomer}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          等待发货 ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-gray-500">暂无待处理申请</p>
        ) : (
          <ul className="space-y-6">
            {waiting.map((req) => (
              <li
                key={req.id}
                className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {req.customerName} · #{req.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(req.createdAt).toLocaleString("zh-CN")} ·{" "}
                      {SHIPPING_STATUS_LABELS[req.status]}
                    </p>
                  </div>
                </div>
                <ul className="mt-2 text-sm text-gray-700">
                  {req.items.map((item) => (
                    <li key={item.productId}>
                      {item.productName} × {item.quantity}
                    </li>
                  ))}
                </ul>
                {req.customerNote && (
                  <p className="mt-2 text-sm text-gray-600">
                    客户备注：{req.customerNote}
                  </p>
                )}
                <OwnerShipForm requestId={req.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          已发货 ({shipped.length})
        </h2>
        {shipped.length === 0 ? (
          <p className="text-sm text-gray-500">暂无已发货记录</p>
        ) : (
          <ul className="space-y-4">
            {shipped.map((req) => (
              <li
                key={req.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="font-semibold text-gray-900">
                  {req.customerName} · 物流：{req.trackingNumber}
                </p>
                <p className="text-xs text-gray-500">
                  发货时间：
                  {req.shippedAt
                    ? new Date(req.shippedAt).toLocaleString("zh-CN")
                    : "—"}
                </p>
                <ul className="mt-2 text-sm text-gray-700">
                  {req.items.map((item) => (
                    <li key={item.productId}>
                      {item.productName} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
