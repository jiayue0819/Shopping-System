"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/lib/cart/types";
import { cartItemCount, cartTotal } from "@/lib/cart/types";
import { clearCart, loadCart, saveCart } from "@/lib/cart/storage";

type CartContextValue = {
  shopId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  shopId,
  children,
}: {
  shopId: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadCart(shopId);
    setItems(saved?.items ?? []);
    setHydrated(true);
  }, [shopId]);

  useEffect(() => {
    if (!hydrated) return;
    saveCart({ shopId, items });
  }, [shopId, items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + qty }
              : i
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
    },
    []
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    clearCart(shopId);
  }, [shopId]);

  const value = useMemo(
    () => ({
      shopId,
      items,
      total: cartTotal(items),
      itemCount: cartItemCount(items),
      addItem,
      updateQuantity,
      removeItem,
      clear,
      hydrated,
    }),
    [shopId, items, addItem, updateQuantity, removeItem, clear, hydrated]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
