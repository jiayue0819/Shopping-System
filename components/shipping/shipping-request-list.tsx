import type { ShippingRequestView } from "@/lib/shipping/fetch-shipping";
import { SHIPPING_STATUS_LABELS } from "@/lib/shipping/status-labels";

export function ShippingRequestList({
  requests,
  showCustomer = false,
}: {
  requests: ShippingRequestView[];
  showCustomer?: boolean;
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-gray-500">暂无发货申请记录</p>;
  }

  return (
    <ul className="space-y-4">
      {requests.map((req) => (
        <li
          key={req.id}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">
                申请 #{req.id.slice(0, 8)}
                {showCustomer && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    · {req.customerName}
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(req.createdAt).toLocaleString("zh-CN")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                req.status === "waiting"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {SHIPPING_STATUS_LABELS[req.status]}
            </span>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            {req.items.map((item) => (
              <li key={item.productId}>
                {item.productName} × {item.quantity}
              </li>
            ))}
          </ul>

          {req.customerNote && (
            <p className="mt-2 text-sm text-gray-600">客户备注：{req.customerNote}</p>
          )}
          {req.ownerNote && (
            <p className="mt-1 text-sm text-gray-600">老板备注：{req.ownerNote}</p>
          )}
          {req.status === "shipped" && req.trackingNumber && (
            <p className="mt-2 text-sm font-medium text-indigo-700">
              物流单号：{req.trackingNumber}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
