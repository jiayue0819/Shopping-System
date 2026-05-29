"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";

type ShippingLine = { product_id: string; quantity: number };

async function requireAuthProfile() {
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

  if (!profile) {
    return { error: "未绑定店铺", supabase, user, profile: null };
  }

  return { error: null, supabase, user, profile };
}

function parseItemsJson(raw: string): { items: ShippingLine[]; error?: string } {
  try {
    const parsed = JSON.parse(raw) as ShippingLine[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { items: [], error: "请至少选择一件库存商品" };
    }
    for (const line of parsed) {
      if (!line.product_id || !line.quantity || line.quantity < 1) {
        return { items: [], error: "商品数量无效" };
      }
    }
    return { items: parsed };
  } catch {
    return { items: [], error: "提交数据无效" };
  }
}

export async function createShippingRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireAuthProfile();
  if (ctx.error || !ctx.profile) return { error: ctx.error ?? "无权限" };

  const customerNote = String(formData.get("customer_note") ?? "");
  const ownerNote = String(formData.get("owner_note") ?? "");
  const itemsJson = String(formData.get("items_json") ?? "");

  let targetCustomerId = ctx.profile.id;
  if (ctx.profile.role === "owner") {
    targetCustomerId = String(formData.get("customer_id") ?? "");
    if (!targetCustomerId) {
      return { error: "请选择要发货的客户" };
    }
  }

  const { items, error: parseError } = parseItemsJson(itemsJson);
  if (parseError) return { error: parseError };

  const { data: requestId, error } = await ctx.supabase.rpc(
    "create_shipping_request",
    {
      p_customer_id: targetCustomerId,
      p_customer_note: customerNote,
      p_owner_note: ownerNote,
      p_items: items,
    }
  );

  if (error) {
    if (error.message.includes("insufficient_inventory")) {
      return { error: "库存不足，请刷新后重新选择数量" };
    }
    return {
      error: `${error.message}。请确认已执行 migrations/005_shipping_inventory.sql`,
    };
  }

  revalidatePath("/customer/shipping");
  revalidatePath("/customer/inventory");
  revalidatePath("/owner/shipping");

  return {
    success: `发货申请已提交（${requestId}），库存已即时扣减，状态：等待发货`,
  };
}

export async function shipShippingRequestAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireAuthProfile();
  if (ctx.error || !ctx.profile || ctx.profile.role !== "owner") {
    return { error: "仅店铺老板可填写物流单号" };
  }

  const requestId = String(formData.get("request_id") ?? "");
  const trackingNumber = String(formData.get("tracking_number") ?? "").trim();
  const ownerNote = String(formData.get("owner_note") ?? "");

  if (!requestId) return { error: "缺少申请 ID" };
  if (!trackingNumber) return { error: "请填写物流单号" };

  const { error } = await ctx.supabase.rpc("ship_shipping_request", {
    p_request_id: requestId,
    p_tracking_number: trackingNumber,
    p_owner_note: ownerNote,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/owner/shipping");
  revalidatePath("/customer/shipping");

  return { success: "已标记为已发货" };
}
