import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth/session";

export default async function CustomerInventoryPage() {
  const { profile } = await requireCustomer();
  const supabase = await createClient();

  const { data: rawRows } = await supabase
    .from("inventory")
    .select(
      `
      quantity,
      products ( name, price )
    `
    )
    .eq("user_id", profile.id)
    .eq("shop_id", profile.shop_id)
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });

  const rows = (rawRows ?? []) as unknown as {
    quantity: number;
    products: { name: string; price: number } | null;
  }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">专属库存</h1>
        <p className="mt-1 text-sm text-gray-500">
          老板标记「制作完成」后，商品会即时累加到此库存
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500">暂无库存，请等待老板制作完成入库</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  商品
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  持有数量
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.products?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-indigo-600">
                    {row.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
