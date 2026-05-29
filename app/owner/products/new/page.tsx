import { ProductForm } from "@/components/owner/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新增商品</h1>
        <p className="mt-1 text-sm text-gray-500">商品将自动关联到当前店铺</p>
      </div>
      <ProductForm />
    </div>
  );
}
