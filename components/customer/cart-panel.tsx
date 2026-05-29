"use client";

import Link from "next/link";
import { useCart } from "@/components/customer/cart-provider";
import { Button } from "@/components/ui/button";

export function CartPanel() {
  const { items, total, itemCount, updateQuantity, removeItem, hydrated } =
    useCart();

  if (!hydrated) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">加载购物车…</p>
      </aside>
    );
  }

  return (
    <aside className="sticky top-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        购物车
        {itemCount > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({itemCount} 件)
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">购物车是空的</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.productId}
              className="border-b border-gray-100 pb-3 last:border-0"
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-xs text-red-600 hover:underline"
                >
                  移除
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-medium text-indigo-600">
                  ¥{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-base font-semibold">
          <span>合计</span>
          <span className="text-indigo-600">¥{total.toFixed(2)}</span>
        </div>
        <Link
          href={items.length > 0 ? "/customer/checkout" : "#"}
          className={`mt-4 block ${items.length === 0 ? "pointer-events-none" : ""}`}
          aria-disabled={items.length === 0}
        >
          <Button className="w-full" disabled={items.length === 0}>
            去结账
          </Button>
        </Link>
      </div>
    </aside>
  );
}
