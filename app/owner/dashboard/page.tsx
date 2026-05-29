import { InviteCodePanel } from "@/components/owner/invite-code-panel";
import { getCurrentProfile, getCurrentShop } from "@/lib/auth/session";

export default async function OwnerDashboardPage() {
  const [profile, shop] = await Promise.all([
    getCurrentProfile(),
    getCurrentShop(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="mt-1 text-gray-600">
          欢迎，{profile?.display_name ?? "老板"} · {shop?.name}
        </p>
      </div>

      {shop && <InviteCodePanel inviteCode={shop.invite_code} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/owner/products"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-indigo-300"
        >
          <h3 className="font-semibold text-gray-900">商品管理</h3>
          <p className="mt-1 text-sm text-gray-500">增删改查与定价</p>
        </a>
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-gray-400">
          <h3 className="font-semibold">订单 / 退款 / 发货</h3>
          <p className="mt-1 text-sm">第三阶段开放</p>
        </div>
      </div>
    </div>
  );
}
