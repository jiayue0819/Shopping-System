"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";
import type { CartItem } from "@/lib/cart/types";
import { cartTotal } from "@/lib/cart/types";
import {
  buildPaymentProofPath,
  getPaymentProofBucket,
  validatePaymentProofFile,
} from "@/lib/storage/payment-proof";

async function requireCustomerContext() {
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

  if (!profile || profile.role !== "customer") {
    return { error: "仅客户可下单", supabase, user, profile: null };
  }

  return { error: null, supabase, user, profile };
}

export async function submitOrderAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireCustomerContext();
  if (ctx.error || !ctx.user || !ctx.profile) {
    return { error: ctx.error ?? "无权限" };
  }

  const customerNote =
    String(formData.get("customer_note") ?? "").trim() || null;
  const cartJson = String(formData.get("cart_json") ?? "");
  const paymentFile = formData.get("payment_proof");

  if (!(paymentFile instanceof File)) {
    return { error: "必须上传付款转账截图才能提交订单" };
  }

  const fileError = validatePaymentProofFile(paymentFile);
  if (fileError) return { error: fileError };

  let cartItems: CartItem[];
  try {
    cartItems = JSON.parse(cartJson) as CartItem[];
  } catch {
    return { error: "购物车数据无效" };
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { error: "购物车为空" };
  }

  const productIds = cartItems.map((i) => i.productId);
  const { data: products, error: productsError } = await ctx.supabase
    .from("products")
    .select("id, name, price, is_available")
    .eq("shop_id", ctx.profile.shop_id)
    .in("id", productIds);

  if (productsError || !products?.length) {
    return { error: "商品校验失败，请刷新后重试" };
  }

  const productMap = new Map(
    (products as { id: string; name: string; price: number; is_available: boolean }[]).map(
      (p) => [p.id, p]
    )
  );

  const orderItems: {
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[] = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_available) {
      return { error: `商品「${item.name}」已下架或不存在` };
    }
    const unitPrice = Number(product.price);
    orderItems.push({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * item.quantity,
    });
  }

  const totalAmount = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const clientTotal = cartTotal(cartItems);

  if (Math.abs(totalAmount - clientTotal) > 0.01) {
    return { error: "金额已变动，请返回商店刷新购物车" };
  }

  const bucket = getPaymentProofBucket();
  const storagePath = buildPaymentProofPath(
    ctx.profile.shop_id,
    ctx.user.id,
    paymentFile.name
  );

  const fileBuffer = await paymentFile.arrayBuffer();
  const { error: uploadError } = await ctx.supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: paymentFile.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: `付款截图上传失败：${uploadError.message}。请确认已执行 003 迁移并创建 Storage 桶。`,
    };
  }

  const paymentProofUrl = `${bucket}/${storagePath}`;

  const { data: orderNumber, error: rpcError } = await ctx.supabase.rpc(
    "generate_order_number",
    { p_shop_id: ctx.profile.shop_id }
  );

  if (rpcError || !orderNumber) {
    await ctx.supabase.storage.from(bucket).remove([storagePath]);
    return { error: "生成订单号失败" };
  }

  const { data: order, error: orderError } = await ctx.supabase
    .from("orders")
    .insert({
      shop_id: ctx.profile.shop_id,
      customer_id: ctx.profile.id,
      order_number: orderNumber as string,
      status: "pending_review",
      total_amount: totalAmount,
      payment_proof_url: paymentProofUrl,
      customer_note: customerNote,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    await ctx.supabase.storage.from(bucket).remove([storagePath]);
    return { error: orderError?.message ?? "创建订单失败" };
  }

  const orderId = (order as { id: string }).id;

  const { error: itemsError } = await ctx.supabase.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      status: "pending_review",
    }))
  );

  if (itemsError) {
    await ctx.supabase.from("orders").delete().eq("id", orderId);
    await ctx.supabase.storage.from(bucket).remove([storagePath]);
    return { error: itemsError.message };
  }

  revalidatePath("/customer/orders");
  redirect(`/customer/orders?success=1`);
}
