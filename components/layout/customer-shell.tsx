import { Sidebar, type NavItem } from "@/components/layout/sidebar";

const customerNav: NavItem[] = [
  { href: "/customer/shop", label: "商品选购" },
  { href: "/customer/orders", label: "我的订单" },
  { href: "/customer/inventory", label: "专属库存" },
  { href: "/customer/shipping", label: "发货申请" },
];

export function CustomerShell({
  shopName,
  children,
}: {
  shopName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar title="客户端" subtitle={shopName} navItems={customerNav} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
