import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth/session";
import { ProductCard, type ShopProduct } from "@/components/customer/product-card";
import { CartPanel } from "@/components/customer/cart-panel";

export default async function CustomerShopPage() {
  const { profile } = await requireCustomer();
  const supabase = await createClient();

  const { data: rawProducts } = await supabase
    .from("products")
    .select("id, name, description, price, image_url")
    .eq("shop_id", profile.shop_id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

  const products = (rawProducts ?? []) as ShopProduct[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">商品选购</h1>
        <p className="mt-1 text-sm text-gray-500">
          仅显示您绑定店铺的上架商品，加入购物车后自动计算金额
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {products.length === 0 ? (
            <p className="text-gray-500">暂无在售商品</p>
          ) : (
            products.map((p) => <ProductCard key={p.id} product={p} />)
          )}
        </div>
        <CartPanel />
      </div>
    </div>
  );
}
