-- 第二阶段：认证辅助（邀请码查询、profile 自读）
-- 在 Supabase SQL Editor 中于 schema.sql 之后执行

-- 注册时校验邀请码（匿名可调用）
CREATE OR REPLACE FUNCTION public.lookup_shop_by_invite_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name
  FROM shops s
  WHERE s.invite_code = upper(trim(p_code))
    AND s.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_shop_by_invite_code(TEXT) TO anon, authenticated;

-- 用户始终可读自己的 profile（避免注册后首次查询失败）
DROP POLICY IF EXISTS profiles_select_self ON profiles;
CREATE POLICY profiles_select_self ON profiles
  FOR SELECT USING (id = auth.uid());
