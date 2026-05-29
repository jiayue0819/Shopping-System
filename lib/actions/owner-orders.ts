"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";
import {
  buildRefundProofPath,
  getRefundProofBucket,
  validateRefundProofFile,
} from "@/lib/storage/refund-proof";

async function requireOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "未登录", supabase, user: null, profile: null };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, shop_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as {
    id: string;
    shop_id: string;
    role: string;
  } | null;

  if (!profile || profile.role !== "owner") {
    return { error: "仅店铺老板可操作", supabase, user, profile: null };
  }

  return { error: null, supabase, user, profile };
}

async function getOwnerOrderItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderItemId: string,
  shopId: string
) {
  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, status, product_id, quantity")
    .eq("id", orderItemId)
    .maybeSingle();

  if (!item) return { error: "商品明细不存在", item: null, order: null };

  const row = item as {
    id: string;
    order_id: string;
    status: string;
    product_id: string;
    quantity: number;
  };

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, customer_id, status")
    .eq("id", row.order_id)
    .eq("shop_id", shopId)
    .maybeSingle();

  if (!order) return { error: "无权操作该订单", item: null, order: null };

  return {
    error: null,
    item: row,
    order: order as {
      id: string;
      shop_id: string;
      customer_id: string;
      status: string;
    },
  };
}

export async function approveOrderAction(orderId: string): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (ctx.error || !ctx.profile) return { error: ctx.error ?? "无权限" };

  const { data: order } = await ctx.supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("shop_id", ctx.profile.shop_id)
    .maybeSingle();

  if (!order) return { error: "订单不存在" };
  if ((order as { status: string }).status !== "pending_review") {
    return { error: "仅「待确认」订单可接单" };
  }

  const { error: orderError } = await ctx.supabase
    .from("orders")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.profile.id,
    })
    .eq("id", orderId);

  if (orderError) return { error: orderError.message };

  const { error: itemsError } = await ctx.supabase
    .from("order_items")
    .update({ status: "in_production" })
    .eq("order_id", orderId)
    .eq("status", "pending_review");

  if (itemsError) return { error: itemsError.message };

  revalidatePath("/owner/orders");
  return { success: "已接单，商品进入制作中" };
}

export async function completeOrderItemAction(
  orderItemId: string
): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (ctx.error || !ctx.profile) return { error: ctx.error ?? "无权限" };

  const check = await getOwnerOrderItem(
    ctx.supabase,
    orderItemId,
    ctx.profile.shop_id
  );
  if (check.error || !check.item) return { error: check.error ?? "无效明细" };

  if (check.item.status !== "in_production") {
    return { error: "仅「制作中」的商品可标记制作完成" };
  }

  const { error } = await ctx.supabase.rpc("complete_order_item_stock", {
    p_order_item_id: orderItemId,
  });

  if (error) {
    return {
      error: `${error.message}。请确认已执行 migrations/004_owner_order_workflow.sql`,
    };
  }

  revalidatePath("/owner/orders");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/inventory");
  return { success: "制作完成，已即时累加到客户专属库存" };
}

export async function rejectOrderItemAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireOwnerContext();
  if (ctx.error || !ctx.profile || !ctx.user) {
    return { error: ctx.error ?? "无权限" };
  }

  const orderItemId = String(formData.get("order_item_id") ?? "");
  const ownerReason = String(formData.get("owner_reason") ?? "").trim() || null;
  const refundFile = formData.get("refund_proof");

  if (!orderItemId) return { error: "缺少商品明细" };
  if (!(refundFile instanceof File)) {
    return { error: "拒绝制作必须上传退款记录截图" };
  }

  const fileError = validateRefundProofFile(refundFile);
  if (fileError) return { error: fileError };

  const check = await getOwnerOrderItem(
    ctx.supabase,
    orderItemId,
    ctx.profile.shop_id
  );
  if (check.error || !check.item || !check.order) {
    return { error: check.error ?? "无效明细" };
  }

  if (!["pending_review", "in_production"].includes(check.item.status)) {
    return { error: "当前状态不可拒绝制作" };
  }

  const bucket = getRefundProofBucket();
  const storagePath = buildRefundProofPath(
    ctx.profile.shop_id,
    ctx.user.id,
    refundFile.name
  );

  const fileBuffer = await refundFile.arrayBuffer();
  const { error: uploadError } = await ctx.supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: refundFile.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: `退款截图上传失败：${uploadError.message}` };
  }

  const refundProofUrl = `${bucket}/${storagePath}`;

  const { error: refundError } = await ctx.supabase.from("refund_records").insert({
    shop_id: ctx.profile.shop_id,
    order_item_id: orderItemId,
    owner_id: ctx.profile.id,
    customer_id: check.order.customer_id,
    refund_proof_url: refundProofUrl,
    owner_reason: ownerReason,
    customer_status: "pending",
  });

  if (refundError) {
    await ctx.supabase.storage.from(bucket).remove([storagePath]);
    return { error: refundError.message };
  }

  const { error: itemError } = await ctx.supabase
    .from("order_items")
    .update({ status: "refund_pending" })
    .eq("id", orderItemId);

  if (itemError) {
    return { error: itemError.message };
  }

  revalidatePath("/owner/orders");
  revalidatePath("/customer/orders");
  return { success: "已拒绝制作，等待客户确认退款" };
}
