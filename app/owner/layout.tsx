import { OwnerShell } from "@/components/layout/owner-shell";
import { getCurrentShop, requireOwner } from "@/lib/auth/session";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  const shop = await getCurrentShop();

  return (
    <OwnerShell shopName={shop?.name ?? "我的店铺"}>{children}</OwnerShell>
  );
}
