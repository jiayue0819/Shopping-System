"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/auth/actions";

export async function confirmRefundAction(
  refundRecordId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "未登录" };

  const { data: refund } = await supabase
    .from("refund_records")
    .select("id, order_item_id, customer_id, customer_status")
    .eq("id", refundRecordId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!refund) return { error: "退款记录不存在" };

  const row = refund as {
    id: string;
    order_item_id: string;
    customer_id: string;
    customer_status: string;
  };

  if (row.customer_status === "confirmed") {
    return { error: "已确认过退款" };
  }

  const { error: refundError } = await supabase
    .from("refund_records")
    .update({
      customer_status: "confirmed",
      customer_confirmed_at: new Date().toISOString(),
    })
    .eq("id", refundRecordId);

  if (refundError) return { error: refundError.message };

  const { error: itemError } = await supabase
    .from("order_items")
    .update({ status: "refunded" })
    .eq("id", row.order_item_id);

  if (itemError) return { error: itemError.message };

  revalidatePath("/customer/orders");
  revalidatePath("/owner/orders");
  return { success: "已确认收到退款，流程已闭环" };
}
