import type { CartState } from "@/lib/cart/types";

const PREFIX = "shopping-cart";

export function cartStorageKey(shopId: string) {
  return `${PREFIX}:${shopId}`;
}

export function loadCart(shopId: string): CartState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cartStorageKey(shopId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartState;
    if (parsed.shopId !== shopId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCart(cart: CartState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(cartStorageKey(cart.shopId), JSON.stringify(cart));
}

export function clearCart(shopId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(cartStorageKey(shopId));
}
