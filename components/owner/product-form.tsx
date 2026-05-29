"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import type { ActionResult } from "@/lib/auth/actions";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

import type { ProductRow } from "@/types/database";

const initial: ActionResult = {};

export function ProductForm({ product }: { product?: ProductRow }) {
  const isEdit = Boolean(product);
  const [state, formAction] = useFormState(
    isEdit ? updateProductAction : createProductAction,
    initial
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {isEdit && <input type="hidden" name="product_id" value={product!.id} />}
      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}

      <div>
        <Label htmlFor="name">商品名称</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>
      <div>
        <Label htmlFor="description">描述</Label>
        <Input
          id="description"
          name="description"
          defaultValue={product?.description ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="price">价格（元）</Label>
        <Input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={product?.price}
        />
      </div>
      <div>
        <Label htmlFor="image_url">图片 URL（可选）</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={product?.image_url ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="sort_order">排序（数字越小越靠前）</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={product?.sort_order ?? 0}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="is_available"
          name="is_available"
          type="checkbox"
          defaultChecked={product?.is_available ?? true}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_available" className="mb-0">
          上架销售
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{isEdit ? "保存修改" : "创建商品"}</Button>
        <Link href="/owner/products">
          <Button type="button" variant="secondary">
            返回列表
          </Button>
        </Link>
      </div>
    </form>
  );
}
