-- 第五阶段：发货申请与库存即时扣减（事务内完成）

-- ---------------------------------------------------------------------------
-- 创建发货申请：在同一事务中扣减 inventory 并写入申请明细
-- p_items: [{"product_id": "uuid", "quantity": 2}, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_shipping_request(
  p_customer_id UUID,
  p_customer_note TEXT,
  p_owner_note TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role user_role;
  v_shop_id UUID;
  v_request_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty INT;
  v_available INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role, shop_id INTO v_role, v_shop_id
  FROM profiles WHERE id = v_caller;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_customer_id AND shop_id = v_shop_id AND role = 'customer'
  ) THEN
    RAISE EXCEPTION 'invalid customer';
  END IF;

  IF v_role = 'customer' AND v_caller <> p_customer_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_caller AND role = 'owner' AND shop_id = v_shop_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION '请选择至少一件库存商品';
  END IF;

  INSERT INTO shipping_requests (
    shop_id, customer_id, status, customer_note, owner_note
  )
  VALUES (
    v_shop_id,
    p_customer_id,
    'waiting',
    NULLIF(trim(p_customer_note), ''),
    NULLIF(trim(p_owner_note), '')
  )
  RETURNING id INTO v_request_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::INT;

    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid item payload';
    END IF;

    SELECT quantity INTO v_available
    FROM inventory
    WHERE shop_id = v_shop_id
      AND user_id = p_customer_id
      AND product_id = v_product_id
    FOR UPDATE;

    IF NOT FOUND OR v_available < v_qty THEN
      RAISE EXCEPTION 'insufficient_inventory';
    END IF;

    UPDATE inventory
    SET quantity = quantity - v_qty
    WHERE shop_id = v_shop_id
      AND user_id = p_customer_id
      AND product_id = v_product_id;

    INSERT INTO shipping_request_items (shipping_request_id, product_id, quantity)
    VALUES (v_request_id, v_product_id, v_qty);
  END LOOP;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shipping_request(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 老板回填物流单号并标记已发货
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ship_shipping_request(
  p_request_id UUID,
  p_tracking_number TEXT,
  p_owner_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed TEXT := trim(p_tracking_number);
BEGIN
  IF v_trimmed IS NULL OR char_length(v_trimmed) < 1 THEN
    RAISE EXCEPTION 'tracking_number required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM shipping_requests sr
    INNER JOIN profiles p ON p.shop_id = sr.shop_id
    WHERE sr.id = p_request_id
      AND p.id = auth.uid()
      AND p.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE shipping_requests
  SET
    status = 'shipped',
    tracking_number = v_trimmed,
    owner_note = COALESCE(NULLIF(trim(p_owner_note), ''), owner_note),
    shipped_at = now()
  WHERE id = p_request_id
    AND status = 'waiting';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not found or not waiting';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ship_shipping_request(UUID, TEXT, TEXT) TO authenticated;
