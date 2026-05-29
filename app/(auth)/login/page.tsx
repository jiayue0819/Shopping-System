import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentProfile, roleHomePath } from "@/lib/auth/session";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(roleHomePath(profile.role));
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">登录</h1>
      <LoginForm />
    </>
  );
}
