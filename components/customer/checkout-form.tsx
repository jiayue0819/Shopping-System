"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useCart } from "@/components/customer/cart-provider";
import { submitOrderAction } from "@/lib/actions/orders";
import type { ActionResult } from "@/lib/auth/actions";
import { validatePaymentProofFile } from "@/lib/storage/payment-proof";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

const initial: ActionResult = {};

function SubmitButton({
  canSubmit,
}: {
  canSubmit: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={!canSubmit || pending}>
      {pending ? "提交中…" : "提交订单（待确认）"}
    </Button>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, total, hydrated, clear } = useCart();
  const [state, formAction] = useFormState(submitOrderAction, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/customer/shop");
    }
  }, [hydrated, items.length, router]);

  const canSubmit = Boolean(selectedFile && !fileError && items.length > 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(null);
    setPreview(null);
    setFileError(null);

    if (!file) return;

    const err = validatePaymentProofFile(file);
    if (err) {
      setFileError(err);
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  if (!hydrated) {
    return <p className="text-gray-500">加载中…</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">结账</h1>
          <p className="mt-1 text-sm text-gray-500">
            请上传付款转账截图，上传成功后方可提交订单
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <input
            type="hidden"
            name="cart_json"
            value={JSON.stringify(items)}
            readOnly
          />

          {state.error && <Alert type="error" message={state.error} />}

          <div>
            <Label htmlFor="customer_note">订单备注（可选）</Label>
            <textarea
              id="customer_note"
              name="customer_note"
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              placeholder="例如：送货时间、特殊要求等"
            />
          </div>

          <div>
            <Label htmlFor="payment_proof">
              付款转账截图 <span className="text-red-600">*</span>
            </Label>
            <Input
              id="payment_proof"
              name="payment_proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              className="mt-1"
              onChange={handleFileChange}
            />
            <p className="mt-1 text-xs text-gray-500">
              支持 JPG / PNG / WebP / GIF，最大 5MB。未上传截图无法提交。
            </p>
            {fileError && (
              <p className="mt-2 text-sm text-red-600">{fileError}</p>
            )}
            {preview && (
              <img
                src={preview}
                alt="付款截图预览"
                className="mt-3 max-h-48 rounded-lg border border-gray-200 object-contain"
              />
            )}
            {selectedFile && !fileError && (
              <p className="mt-2 text-sm text-green-700">
                已选择：{selectedFile.name}，可以提交订单
              </p>
            )}
          </div>

          <SubmitButton canSubmit={canSubmit} />

          <Link href="/customer/shop">
            <Button type="button" variant="secondary" className="w-full">
              返回商店
            </Button>
          </Link>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">订单摘要</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>¥{(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-lg font-bold">
          <span>应付总额</span>
          <span className="text-indigo-600">¥{total.toFixed(2)}</span>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          提交后订单状态为「待确认」，等待老板审核付款凭证。
        </p>
      </div>
    </div>
  );
}
