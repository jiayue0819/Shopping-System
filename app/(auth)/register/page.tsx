import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentProfile, roleHomePath } from "@/lib/auth/session";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(roleHomePath(profile.role));
  }

  const role = searchParams.role === "owner" ? "owner" : "customer";

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">注册</h1>
      <p className="mb-6 text-sm text-gray-500">
        {role === "owner"
          ? "老板注册将自动创建店铺并生成邀请码"
          : "客户注册需输入老板提供的邀请码"}
      </p>
      <RegisterForm key={role} role={role} />
    </>
  );
}
