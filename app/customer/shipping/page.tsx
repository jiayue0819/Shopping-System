import { requireCustomer } from "@/lib/auth/session";
import {
  fetchCustomerInventory,
  fetchCustomerShippingRequests,
} from "@/lib/shipping/fetch-shipping";
import { ShippingApplyForm } from "@/components/shipping/shipping-apply-form";
import { ShippingRequestList } from "@/components/shipping/shipping-request-list";

export default async function CustomerShippingPage() {
  const { profile } = await requireCustomer();

  const [inventory, requests] = await Promise.all([
    fetchCustomerInventory(profile.shop_id, profile.id),
    fetchCustomerShippingRequests(profile.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">发货申请</h1>
        <p className="mt-1 text-sm text-gray-500">
          从专属库存勾选商品申请发货，提交后立即扣减库存
        </p>
      </div>

      <ShippingApplyForm inventory={inventory} role="customer" />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">我的申请记录</h2>
        <ShippingRequestList requests={requests} />
      </section>
    </div>
  );
}
