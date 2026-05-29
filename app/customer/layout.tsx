import { CustomerShell } from "@/components/layout/customer-shell";
import { CartProvider } from "@/components/customer/cart-provider";
import { getCurrentShop, requireCustomer } from "@/lib/auth/session";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireCustomer();
  const shop = await getCurrentShop();

  return (
    <CartProvider shopId={profile.shop_id}>
      <CustomerShell shopName={shop?.name ?? "店铺"}>{children}</CustomerShell>
    </CartProvider>
  );
}
