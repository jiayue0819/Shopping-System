import { requireOwner } from "@/lib/auth/session";
import { fetchOwnerOrders } from "@/lib/orders/fetch-orders";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status-labels";
import {
  ApproveOrderButton,
  OwnerOrderItemRow,
} from "@/components/owner/owner-order-actions";

export default async function OwnerOrdersPage() {
  const { profile } = await requireOwner();
  const orders = await fetchOwnerOrders(profile.shop_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看付款截图、接单审批、拒绝退款或标记制作完成入库
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500">暂无客户订单</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {order.orderNumber}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    客户：{order.customerName} ·{" "}
                    {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-6">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">
                    ¥{order.totalAmount.toFixed(2)}
                  </p>
                  {order.customerNote && (
                    <p className="mt-2 text-sm text-gray-600">
                      客户备注：{order.customerNote}
                    </p>
                  )}
                </div>
                {order.paymentProofSignedUrl && (
                  <a
                    href={order.paymentProofSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={order.paymentProofSignedUrl}
                      alt="付款截图"
                      className="h-32 w-auto object-contain"
                    />
                    <span className="block bg-gray-50 px-2 py-1 text-center text-xs text-indigo-600">
                      查看付款截图
                    </span>
                  </a>
                )}
              </div>

              {order.status === "pending_review" && (
                <div className="mt-4">
                  <ApproveOrderButton orderId={order.id} />
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">商品明细</h3>
                <ul className="mt-2">
                  {order.items.map((item) => (
                    <OwnerOrderItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
