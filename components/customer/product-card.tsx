"use client";

import { useCart } from "@/components/customer/cart-provider";
import { Button } from "@/components/ui/button";

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export function ProductCard({ product }: { product: ShopProduct }) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="mb-3 h-36 w-full rounded-lg object-cover"
        />
      )}
      <h3 className="font-semibold text-gray-900">{product.name}</h3>
      {product.description && (
        <p className="mt-1 flex-1 text-sm text-gray-500 line-clamp-2">
          {product.description}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">
          ¥{Number(product.price).toFixed(2)}
        </span>
        <Button
          type="button"
          onClick={() =>
            addItem({
              productId: product.id,
              name: product.name,
              price: Number(product.price),
              imageUrl: product.image_url,
            })
          }
        >
          加入购物车
        </Button>
      </div>
    </div>
  );
}
