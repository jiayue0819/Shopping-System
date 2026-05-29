import Link from "next/link";
import { Suspense } from "react";
import { requireCustomer } from "@/lib/auth/session";
import { fetchCustomerOrders } from "@/lib/orders/fetch-orders";
import { ORDER_STATUS_LABELS } from "@/lib/orders/status-labels";
import { ClearCartOnSuccess } from "@/components/customer/clear-cart-on-success";
import { CustomerOrderItems } from "@/components/customer/customer-order-items";
import { Alert } from "@/components/ui/alert";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const { profile } = await requireCustomer();
  const orders = await fetchCustomerOrders(profile.id);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ClearCartOnSuccess />
      </Suspense>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看明细、退款记录，并确认收到退款
          </p>
        </div>
        <Link
          href="/customer/shop"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          继续选购 →
        </Link>
      </div>

      {searchParams.success === "1" && (
        <Alert
          type="success"
          message="订单已提交，状态为「待确认」，请等待老板审核付款凭证。"
        />
      )}

      {orders.length === 0 ? (
        <p className="text-gray-500">暂无订单</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {order.orderNumber}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <p className="mt-3 text-lg font-bold text-indigo-600">
                ¥{order.totalAmount.toFixed(2)}
              </p>
              {order.customerNote && (
                <p className="mt-2 text-sm text-gray-600">
                  备注：{order.customerNote}
                </p>
              )}
              {order.paymentProofSignedUrl && (
                <a
                  href={order.paymentProofSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                >
                  查看我的付款截图
                </a>
              )}
              <CustomerOrderItems items={order.items} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
