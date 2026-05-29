"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export type NavItem = {
  href: string;
  label: string;
};

export function Sidebar({
  title,
  subtitle,
  navItems,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full">
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  );
}
