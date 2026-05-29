"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHomePath } from "@/lib/auth/session";
import {
  generateInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
} from "@/lib/utils/invite-code";

export type ActionResult = {
  error?: string;
  success?: string;
  /** 登录/注册成功后由客户端跳转，避免 useFormState + redirect() 导致表单卡死 */
  redirectTo?: string;
};

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "请填写邮箱和密码" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "登录失败，请重试" };
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const profile = profileData as { role: "owner" | "customer" } | null;

    if (!profile) {
      return { error: "账号未绑定店铺，请重新注册" };
    }

    const redirectTo = roleHomePath(profile.role);
    revalidatePath("/", "layout");
    return { success: "登录成功，正在跳转…", redirectTo };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("loginAction", e);
    return { error: "登录失败，请检查网络或 Supabase 配置后重试" };
  }
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function registerOwnerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const shopName = String(formData.get("shop_name") ?? "").trim();
    const displayName = String(formData.get("display_name") ?? "").trim();

    if (!email || !password || !shopName) {
      return { error: "请填写邮箱、密码和店铺名称" };
    }
    if (password.length < 6) {
      return { error: "密码至少 6 位" };
    }

    const supabase = await createClient();
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { error: "注册失败，请稍后重试" };
    }

    const inviteCode = generateInviteCode(8);
    const db = authData.session ? supabase : createAdminClient();

    const { data: shop, error: shopError } = await db
      .from("shops")
      .insert({
        owner_id: userId,
        name: shopName,
        invite_code: inviteCode,
      })
      .select("id")
      .single();

    if (shopError || !shop) {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
      return { error: shopError?.message ?? "创建店铺失败" };
    }

    const { error: profileError } = await db.from("profiles").insert({
      id: userId,
      shop_id: shop.id,
      role: "owner",
      display_name: displayName || shopName,
    });

    if (profileError) {
      const admin = createAdminClient();
      await admin.from("shops").delete().eq("id", shop.id);
      await admin.auth.admin.deleteUser(userId);
      return { error: profileError.message };
    }

    if (!authData.session) {
      return {
        success: `店铺已创建，邀请码为 ${inviteCode}。请查收邮件完成验证后再登录。`,
      };
    }

    revalidatePath("/", "layout");
    return { success: "注册成功，正在跳转…", redirectTo: "/owner/dashboard" };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("registerOwnerAction", e);
    return { error: "注册失败，请检查 Supabase 配置或稍后重试" };
  }
}

export async function registerCustomerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const inviteCodeRaw = String(formData.get("invite_code") ?? "");
    const displayName = String(formData.get("display_name") ?? "").trim();
    const inviteCode = normalizeInviteCode(inviteCodeRaw);

    if (!email || !password || !inviteCode) {
      return { error: "请填写邮箱、密码和邀请码" };
    }
    if (!isValidInviteCodeFormat(inviteCode)) {
      return { error: "邀请码格式无效（6-12 位大写字母或数字）" };
    }
    if (password.length < 6) {
      return { error: "密码至少 6 位" };
    }

    const supabase = await createClient();

    const { data: shops, error: lookupError } = await supabase.rpc(
      "lookup_shop_by_invite_code",
      { p_code: inviteCode }
    );

    if (lookupError) {
      return {
        error:
          "无法校验邀请码，请确认已在 Supabase 执行 migrations/002_auth_helpers.sql",
      };
    }

    const shop = Array.isArray(shops) ? shops[0] : shops;
    if (!shop?.id) {
      return { error: "邀请码无效或店铺已停用" };
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return { error: signUpError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { error: "注册失败，请稍后重试" };
    }

    const db = authData.session ? supabase : createAdminClient();

    const { error: profileError } = await db.from("profiles").insert({
      id: userId,
      shop_id: shop.id,
      role: "customer",
      display_name: displayName || email.split("@")[0],
    });

    if (profileError) {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
      return { error: profileError.message };
    }

    if (!authData.session) {
      return { success: "注册成功，请查收邮件完成验证后再登录。" };
    }

    revalidatePath("/", "layout");
    return { success: "注册成功，正在跳转…", redirectTo: "/customer/shop" };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("registerCustomerAction", e);
    return { error: "注册失败，请检查 Supabase 配置或稍后重试" };
  }
}

export async function regenerateInviteCodeAction(
  _prev: ActionResult = {},
  _formData?: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "未登录" };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, shop_id")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { role: string; shop_id: string } | null;

  if (!profile || profile.role !== "owner") {
    return { error: "仅店铺老板可生成邀请码" };
  }

  const newCode = generateInviteCode(8);
  const { error } = await supabase
    .from("shops")
    .update({ invite_code: newCode })
    .eq("id", profile.shop_id)
    .eq("owner_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/owner/dashboard");
  return { success: `新邀请码已生成：${newCode}` };
}
