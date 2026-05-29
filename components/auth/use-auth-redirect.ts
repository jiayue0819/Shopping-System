"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/auth/actions";

/** 将 Server Action 返回的 redirectTo 转为客户端导航，避免 redirect() 卡死表单 */
export function useAuthRedirect(state: ActionResult | undefined) {
  const router = useRouter();
  const redirectTo = state?.redirectTo;

  useEffect(() => {
    if (!redirectTo) return;
    router.push(redirectTo);
    router.refresh();
  }, [redirectTo, router]);
}
