-- =============================================================================
-- 点单与专属库存系统 — PostgreSQL Schema
-- 适用于 Supabase (PostgreSQL 15+)
-- 执行顺序：在 Supabase SQL Editor 中一次性运行，或作为 migration 001
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 扩展与枚举类型
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('owner', 'customer');

CREATE TYPE order_status AS ENUM (
  'pending_payment',   -- 待付款/待上传凭证
  'pending_review',    -- 待老板审核付款
  'approved',          -- 已审核通过
  'rejected',          -- 付款被拒绝
  'cancelled'          -- 已取消
);

CREATE TYPE order_item_status AS ENUM (
  'pending_review',    -- 待审核
  'in_production',     -- 制作中
  'stocked',           -- 已入库（进入专属虚拟库存）
  'refund_pending',    -- 拒绝退款中（老板已拒绝并上传凭证，待客户确认）
  'refunded'           -- 已退款
);

CREATE TYPE refund_customer_status AS ENUM (
  'pending',           -- 待客户确认
  'confirmed',         -- 客户已确认
  'disputed'           -- 客户有异议
);

CREATE TYPE shipping_request_status AS ENUM (
  'waiting',           -- 等待发货
  'shipped'            -- 已发货
);

-- ---------------------------------------------------------------------------
-- shops — 店铺表（老板专属，多店隔离根实体）
-- ---------------------------------------------------------------------------
CREATE TABLE shops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  invite_code   TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shops_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 120),
  CONSTRAINT shops_invite_code_format CHECK (invite_code ~ '^[A-Z0-9]{6,12}$')
);

CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_invite_code ON shops(invite_code);

COMMENT ON TABLE shops IS '店铺表：每个老板可拥有一个或多个店铺，invite_code 供客户加入';
COMMENT ON COLUMN shops.invite_code IS '6-12 位大写字母数字邀请码，客户注册/绑定时使用';

-- ---------------------------------------------------------------------------
-- profiles — 用户扩展表（关联 auth.users，多店隔离核心）
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'customer',
  display_name  TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, shop_id)
);

CREATE INDEX idx_profiles_shop_id ON profiles(shop_id);
CREATE INDEX idx_profiles_shop_role ON profiles(shop_id, role);

COMMENT ON TABLE profiles IS '用户表：同一 auth 用户可在不同 shop 有不同 profile（通过 shop_id 隔离）';
COMMENT ON COLUMN profiles.role IS 'owner=店铺老板, customer=客人';

-- ---------------------------------------------------------------------------
-- products — 商品表
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(12, 2) NOT NULL,
  image_url     TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_price_positive CHECK (price >= 0),
  CONSTRAINT products_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 200)
);

CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_shop_available ON products(shop_id, is_available);

COMMENT ON TABLE products IS '商品表：老板可编辑名称、描述、定价与上下架';

-- ---------------------------------------------------------------------------
-- orders — 订单主表
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_number        TEXT NOT NULL,
  status              order_status NOT NULL DEFAULT 'pending_payment',
  total_amount        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_proof_url   TEXT,
  customer_note       TEXT,
  owner_note          TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_total_non_negative CHECK (total_amount >= 0),
  UNIQUE (shop_id, order_number)
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

COMMENT ON TABLE orders IS '订单主表：客人线上点单，含付款截图链接';
COMMENT ON COLUMN orders.payment_proof_url IS '客户上传的付款截图 URL（Supabase Storage 等）';

-- ---------------------------------------------------------------------------
-- order_items — 订单明细表
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12, 2) NOT NULL,
  subtotal        NUMERIC(12, 2) NOT NULL,
  status          order_item_status NOT NULL DEFAULT 'pending_review',
  owner_note      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT order_items_subtotal_non_negative CHECK (subtotal >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_status ON order_items(status);

COMMENT ON TABLE order_items IS '订单明细：每件商品独立状态（待审核→制作中→已入库/退款流程）';

-- ---------------------------------------------------------------------------
-- inventory — 专属虚拟库存表（核心）
-- 客户在某店铺下某商品的持有数量，审核入库后累加
-- ---------------------------------------------------------------------------
CREATE TABLE inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0),
  UNIQUE (shop_id, user_id, product_id)
);

CREATE INDEX idx_inventory_user_shop ON inventory(user_id, shop_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);

COMMENT ON TABLE inventory IS '专属虚拟库存：user_id + product_id + quantity，多店通过 shop_id 隔离';

-- ---------------------------------------------------------------------------
-- refund_records — 退款记录表
-- 老板拒绝某件 order_item 时创建，需上传 refund_proof_url
-- ---------------------------------------------------------------------------
CREATE TABLE refund_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_item_id         UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  owner_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  customer_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  refund_proof_url      TEXT NOT NULL,
  owner_reason          TEXT,
  customer_status       refund_customer_status NOT NULL DEFAULT 'pending',
  customer_confirmed_at TIMESTAMPTZ,
  customer_note         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);

CREATE INDEX idx_refund_records_shop_id ON refund_records(shop_id);
CREATE INDEX idx_refund_records_customer ON refund_records(customer_id);
CREATE INDEX idx_refund_records_customer_status ON refund_records(customer_status);

COMMENT ON TABLE refund_records IS '退款记录：老板拒绝商品时上传凭证，客户确认后 item 状态变为已退款';

-- ---------------------------------------------------------------------------
-- shipping_requests — 发货申请表
-- ---------------------------------------------------------------------------
CREATE TABLE shipping_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status              shipping_request_status NOT NULL DEFAULT 'waiting',
  tracking_number     TEXT,
  customer_note       TEXT,
  owner_note          TEXT,
  shipped_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_requests_shop ON shipping_requests(shop_id);
CREATE INDEX idx_shipping_requests_customer ON shipping_requests(customer_id);
CREATE INDEX idx_shipping_requests_status ON shipping_requests(shop_id, status);

COMMENT ON TABLE shipping_requests IS '发货申请主表：记录物流单号与买卖双方备注';

-- ---------------------------------------------------------------------------
-- shipping_request_items — 发货申请明细（关联库存商品与数量）
-- ---------------------------------------------------------------------------
CREATE TABLE shipping_request_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_request_id   UUID NOT NULL REFERENCES shipping_requests(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity              INT NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shipping_request_items_quantity_positive CHECK (quantity > 0),
  UNIQUE (shipping_request_id, product_id)
);

CREATE INDEX idx_shipping_request_items_request ON shipping_request_items(shipping_request_id);

COMMENT ON TABLE shipping_request_items IS '发货申请商品明细';

-- ---------------------------------------------------------------------------
-- 通用 updated_at 触发器
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shops_updated_at
  BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_refund_records_updated_at
  BEFORE UPDATE ON refund_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shipping_requests_updated_at
  BEFORE UPDATE ON shipping_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 订单号生成辅助（可选，应用层也可生成）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_order_number(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_seq INT;
BEGIN
  SELECT COALESCE(COUNT(*)::INT, 0) + 1 INTO v_seq
  FROM orders WHERE shop_id = p_shop_id
  AND created_at::date = CURRENT_DATE;

  RETURN 'ORD-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS) — 多店隔离骨架
-- 生产环境请根据业务细化 policy；以下为启用 RLS 的基础框架
-- ---------------------------------------------------------------------------
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_request_items ENABLE ROW LEVEL SECURITY;

-- 辅助：当前用户在某店的 profile
CREATE OR REPLACE FUNCTION auth_user_shop_ids()
RETURNS SETOF UUID AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- shops: 老板看自己拥有的店；客户看自己已加入的店
CREATE POLICY shops_owner_all ON shops
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY shops_customer_select ON shops
  FOR SELECT USING (id IN (SELECT auth_user_shop_ids()));

-- profiles: 同店用户可读；仅本人可改自己的 profile
CREATE POLICY profiles_select_same_shop ON profiles
  FOR SELECT USING (shop_id IN (SELECT auth_user_shop_ids()));

CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- products: 同店可读；仅 owner 可写
CREATE POLICY products_select_same_shop ON products
  FOR SELECT USING (shop_id IN (SELECT auth_user_shop_ids()));

CREATE POLICY products_owner_write ON products
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- orders: 客户看自己订单；owner 看本店全部
CREATE POLICY orders_customer_own ON orders
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY orders_customer_insert ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY orders_owner_shop ON orders
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- order_items: 通过 order 关联隔离（简化：同店 profiles 可读）
CREATE POLICY order_items_via_order ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE shop_id IN (SELECT auth_user_shop_ids())
    )
  );

-- inventory: 客户看自己的；owner 看本店全部
CREATE POLICY inventory_customer_own ON inventory
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY inventory_owner_shop ON inventory
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- refund_records: 买卖双方相关记录
CREATE POLICY refund_records_participants ON refund_records
  FOR SELECT USING (customer_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY refund_records_customer_update ON refund_records
  FOR UPDATE USING (customer_id = auth.uid());

-- shipping_requests: 客户自己的申请；owner 本店全部
CREATE POLICY shipping_customer_own ON shipping_requests
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY shipping_owner_shop ON shipping_requests
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY shipping_items_via_request ON shipping_request_items
  FOR SELECT USING (
    shipping_request_id IN (
      SELECT id FROM shipping_requests
      WHERE shop_id IN (SELECT auth_user_shop_ids())
    )
  );
