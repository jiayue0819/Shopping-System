import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, roleHomePath } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

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
        <Link href="/login">
          <Button>登录</Button>
        </Link>
        <Link href="/register?role=owner">
          <Button variant="secondary">老板注册</Button>
        </Link>
        <Link href="/register?role=customer">
          <Button variant="secondary">客户注册（需邀请码）</Button>
        </Link>
      </div>
    </main>
  );
}
