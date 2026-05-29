export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
};

export type CartState = {
  shopId: string;
  items: CartItem[];
};

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
