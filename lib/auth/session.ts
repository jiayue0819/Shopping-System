import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type Profile = {
  id: string;
  shop_id: string;
  role: UserRole;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export type Shop = {
  id: string;
  name: string;
  invite_code: string;
  description: string | null;
};

export function roleHomePath(role: UserRole): string {
  return role === "owner" ? "/owner/dashboard" : "/customer/shop";
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, shop_id, role, display_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getCurrentShop(): Promise<Shop | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name, invite_code, description")
    .eq("id", profile.shop_id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Shop;
}

export async function requireAuth(redirectTo = "/login") {
  const user = await getSessionUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/register");
  }

  if (profile.role !== role) {
    redirect(roleHomePath(profile.role));
  }

  return { user, profile };
}

export async function requireOwner() {
  return requireRole("owner");
}

export async function requireCustomer() {
  return requireRole("customer");
}
