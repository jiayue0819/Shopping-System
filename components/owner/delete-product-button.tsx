"use client";

import { useTransition } from "react";
import { deleteProductAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";

export function DeleteProductButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("确定删除该商品？")) return;
        startTransition(async () => {
          await deleteProductAction(productId);
        });
      }}
    >
      删除
    </Button>
  );
}
