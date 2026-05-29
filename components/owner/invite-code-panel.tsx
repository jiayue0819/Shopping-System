"use client";

import { useFormState } from "react-dom";
import { regenerateInviteCodeAction, type ActionResult } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initial: ActionResult = {};

export function InviteCodePanel({ inviteCode }: { inviteCode: string }) {
  const [state, formAction] = useFormState(regenerateInviteCodeAction, initial);

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
      <h3 className="text-lg font-semibold text-indigo-900">店铺邀请码</h3>
      <p className="mt-1 text-sm text-indigo-700">
        仅老板可生成邀请码。客户注册时必须填写此码才能绑定到您的店铺。
      </p>

      {state.error && (
        <div className="mt-3">
          <Alert type="error" message={state.error} />
        </div>
      )}
      {state.success && (
        <div className="mt-3">
          <Alert type="success" message={state.success} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <code className="rounded-lg bg-white px-4 py-3 text-2xl font-bold tracking-widest text-indigo-800">
          {inviteCode}
        </code>
        <Button type="button" variant="secondary" onClick={copyCode}>
          复制
        </Button>
        <form action={formAction}>
          <Button type="submit" variant="primary">
            重新生成邀请码
          </Button>
        </form>
      </div>
    </div>
  );
}
