import { notFound } from "next/navigation";
import { ProductForm } from "@/components/owner/product-form";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/session";
import type { ProductRow } from "@/types/database";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireOwner();
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .eq("shop_id", profile.shop_id)
    .maybeSingle();

  const product = data as ProductRow | null;
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">编辑商品</h1>
        <p className="mt-1 text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
