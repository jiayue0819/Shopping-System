import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, roleHomePath } from "@/lib/auth/session";

const btnBase =
  "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(roleHomePath(profile.role));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">点单与专属库存系统</h1>
        <p className="mt-3 text-gray-600">
          多租户店铺隔离 · 老板邀请码绑定 · 专属虚拟库存
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/login"
          className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          登录
        </Link>
        <Link
          href="/register?role=owner"
          className={`${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          老板注册
        </Link>
        <Link
          href="/register?role=customer"
          className={`${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
        >
          客户注册（需邀请码）
        </Link>
      </div>
    </main>
  );
}
