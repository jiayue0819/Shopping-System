"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { loginAction, type ActionResult } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const emptyFeedback: ActionResult = {};

export function LoginForm() {
  const [feedback, setFeedback] = useState<ActionResult>(emptyFeedback);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(emptyFeedback);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await loginAction(emptyFeedback, formData);

      if (result.redirectTo) {
        // 硬跳转：Session Cookie 立即生效，避免 useFormState / router.push 无反应
        window.location.assign(result.redirectTo);
        return;
      }

      setFeedback(result);
    } catch (err) {
      console.error("login submit", err);
      setFeedback({ error: "登录失败，请稍后重试" });
    } finally {
      setPending(false);
    }
  }

  const { error, success } = feedback;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={pending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "登录中…" : "登录"}
      </Button>

      <p className="text-center text-sm text-gray-600">
        还没有账号？{" "}
        <Link href="/register?role=customer" className="text-indigo-600 hover:underline">
          客户注册
        </Link>
        {" · "}
        <Link href="/register?role=owner" className="text-indigo-600 hover:underline">
          老板注册
        </Link>
      </p>
    </form>
  );
}
