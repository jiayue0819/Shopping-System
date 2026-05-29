import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/session";
import type { ProductRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { DeleteProductButton } from "@/components/owner/delete-product-button";

export default async function OwnerProductsPage() {
  const { profile } = await requireOwner();
  const supabase = await createClient();

  const { data: rawProducts, error } = await supabase
    .from("products")
    .select("*")
    .eq("shop_id", profile.shop_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const products = (rawProducts ?? []) as ProductRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            仅当前店铺老板可编辑与定价
          </p>
        </div>
        <Link href="/owner/products/new">
          <Button>新增商品</Button>
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">加载失败：{error.message}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                名称
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                价格
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                状态
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                排序
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  暂无商品，点击「新增商品」开始
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">¥{Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.is_available ? "上架" : "下架"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/owner/products/${p.id}/edit`}>
                        <Button variant="secondary">编辑</Button>
                      </Link>
                      <DeleteProductButton productId={p.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
