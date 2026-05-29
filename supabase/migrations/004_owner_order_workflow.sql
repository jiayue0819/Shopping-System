-- 第四阶段：接单审批、拒绝退款、制作入库

-- ---------------------------------------------------------------------------
-- order_items：老板可更新本店订单明细状态
-- ---------------------------------------------------------------------------
CREATE POLICY order_items_owner_update ON order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT o.id FROM orders o
      INNER JOIN profiles p ON p.shop_id = o.shop_id
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- refund_records：老板可创建退款记录
-- ---------------------------------------------------------------------------
CREATE POLICY refund_records_owner_insert ON refund_records
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage：退款凭证桶
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-proofs',
  'refund-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY refund_proofs_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'refund-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY refund_proofs_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY refund_proofs_customer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'refund-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
  );

-- ---------------------------------------------------------------------------
-- 制作完成：原子更新明细状态并累加专属库存
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_order_item_stock(p_order_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item order_items%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM order_items WHERE id = p_order_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_item not found';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = v_item.order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner' AND shop_id = v_order.shop_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_item.status <> 'in_production' THEN
    RAISE EXCEPTION 'item must be in_production';
  END IF;

  UPDATE order_items SET status = 'stocked' WHERE id = p_order_item_id;

  INSERT INTO inventory (shop_id, user_id, product_id, quantity)
  VALUES (v_order.shop_id, v_order.customer_id, v_item.product_id, v_item.quantity)
  ON CONFLICT (shop_id, user_id, product_id)
  DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_order_item_stock(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- order_items：客户确认退款时可更新明细状态
-- ---------------------------------------------------------------------------
CREATE POLICY order_items_customer_refund_update ON order_items
  FOR UPDATE USING (
    id IN (
      SELECT order_item_id FROM refund_records WHERE customer_id = auth.uid()
    )
  );
