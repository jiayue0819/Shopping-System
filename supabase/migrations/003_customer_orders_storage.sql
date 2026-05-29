-- 第三阶段：客户下单、付款凭证 Storage、订单明细写入

-- ---------------------------------------------------------------------------
-- orders：客户只能向自己绑定的店铺下单
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS orders_customer_insert ON orders;
CREATE POLICY orders_customer_insert ON orders
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    AND shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid() AND role = 'customer')
  );

-- ---------------------------------------------------------------------------
-- order_items：客户可为自己订单写入明细
-- ---------------------------------------------------------------------------
CREATE POLICY order_items_customer_insert ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage：付款截图桶（若已存在则跳过）
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 客户仅可上传到自己的目录：{shop_id}/{user_id}/...
CREATE POLICY payment_proofs_customer_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM profiles WHERE id = auth.uid() AND role = 'customer'
    )
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 客户可读自己上传的文件
CREATE POLICY payment_proofs_customer_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 老板可读本店客户上传的付款凭证
CREATE POLICY payment_proofs_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );
