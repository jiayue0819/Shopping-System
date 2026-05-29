"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** 必须在 <form> 内部使用，配合 useFormState 的 action */
export function AuthSubmitButton({
  children,
  pendingLabel = "提交中…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
