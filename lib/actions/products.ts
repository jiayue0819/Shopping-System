"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";

async function requireOwnerShop() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "未登录", supabase, shopId: null as string | null };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, shop_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { role: string; shop_id: string } | null;

  if (!profile || profile.role !== "owner") {
    return { error: "仅店铺老板可操作", supabase, shopId: null };
  }

  return { error: null, supabase, shopId: profile.shop_id };
}

export async function createProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireOwnerShop();
  if (ctx.error || !ctx.shopId) return { error: ctx.error ?? "无权限" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parseFloat(String(formData.get("price") ?? ""));
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const isAvailable = formData.get("is_available") === "on";
  const sortOrder = parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  if (!name) return { error: "请填写商品名称" };
  if (Number.isNaN(price) || price < 0) return { error: "请填写有效价格" };

  const { error } = await ctx.supabase.from("products").insert({
    shop_id: ctx.shopId,
    name,
    description,
    price,
    image_url: imageUrl,
    is_available: isAvailable,
    sort_order: sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/owner/products");
  return { success: "商品已创建" };
}

export async function updateProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireOwnerShop();
  if (ctx.error || !ctx.shopId) return { error: ctx.error ?? "无权限" };

  const productId = String(formData.get("product_id") ?? "");
  if (!productId) return { error: "缺少商品 ID" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = parseFloat(String(formData.get("price") ?? ""));
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const isAvailable = formData.get("is_available") === "on";
  const sortOrder = parseInt(String(formData.get("sort_order") ?? "0"), 10) || 0;

  if (!name) return { error: "请填写商品名称" };
  if (Number.isNaN(price) || price < 0) return { error: "请填写有效价格" };

  const { error } = await ctx.supabase
    .from("products")
    .update({
      name,
      description,
      price,
      image_url: imageUrl,
      is_available: isAvailable,
      sort_order: sortOrder,
    })
    .eq("id", productId)
    .eq("shop_id", ctx.shopId);

  if (error) return { error: error.message };

  revalidatePath("/owner/products");
  revalidatePath(`/owner/products/${productId}/edit`);
  return { success: "商品已更新" };
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const ctx = await requireOwnerShop();
  if (ctx.error || !ctx.shopId) return { error: ctx.error ?? "无权限" };

  const { error } = await ctx.supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("shop_id", ctx.shopId);

  if (error) return { error: error.message };

  revalidatePath("/owner/products");
  return { success: "商品已删除" };
}
