"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  registerCustomerAction,
  registerOwnerAction,
  type ActionResult,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const emptyFeedback: ActionResult = {};

export function RegisterForm({ role }: { role: "owner" | "customer" }) {
  const isOwner = role === "owner";
  const [feedback, setFeedback] = useState<ActionResult>(emptyFeedback);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(emptyFeedback);

    const formData = new FormData(event.currentTarget);
    const action = isOwner ? registerOwnerAction : registerCustomerAction;

    try {
      const result = await action(emptyFeedback, formData);

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      setFeedback(result);
    } catch (err) {
      console.error("register submit", err);
      setFeedback({ error: "注册失败，请稍后重试" });
    } finally {
      setPending(false);
    }
  }

  const { error, success } = feedback;

  return (
    <div className="space-y-6">
      <div className="flex rounded-lg border border-gray-200 p-1">
        <Link
          href="/register?role=owner"
          className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${
            isOwner ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          我是老板
        </Link>
        <Link
          href="/register?role=customer"
          className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${
            !isOwner ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          我是客户
        </Link>
      </div>

      <form key={role} onSubmit={onSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {isOwner ? (
          <div>
            <Label htmlFor="shop_name">店铺名称</Label>
            <Input id="shop_name" name="shop_name" required disabled={pending} />
            <p className="mt-1 text-xs text-gray-500">
              注册成功后系统将自动生成邀请码，供客户绑定店铺
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="invite_code">邀请码（必填）</Label>
            <Input
              id="invite_code"
              name="invite_code"
              required
              placeholder="向店铺老板索取"
              className="uppercase"
              maxLength={12}
              disabled={pending}
            />
            <p className="mt-1 text-xs text-gray-500">
              客户注册必须输入老板提供的邀请码才能加入对应店铺
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="display_name">显示名称</Label>
          <Input id="display_name" name="display_name" disabled={pending} />
        </div>
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
            minLength={6}
            autoComplete="new-password"
            disabled={pending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending ? "注册中…" : isOwner ? "注册并创建店铺" : "注册并加入店铺"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        已有账号？{" "}
        <Link href="/login" className="text-indigo-600 hover:underline">
          去登录
        </Link>
      </p>
    </div>
  );
}
