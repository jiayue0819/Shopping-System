import { Sidebar, type NavItem } from "@/components/layout/sidebar";

const ownerNav: NavItem[] = [
  { href: "/owner/dashboard", label: "仪表盘" },
  { href: "/owner/products", label: "商品管理" },
  { href: "/owner/orders", label: "订单管理" },
  { href: "/owner/refunds", label: "退款处理" },
  { href: "/owner/shipping", label: "发货管理" },
];

export function OwnerShell({
  shopName,
  children,
}: {
  shopName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar title="老板端" subtitle={shopName} navItems={ownerNav} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
