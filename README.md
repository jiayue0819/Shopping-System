# 点单与专属库存系统

基于 **Next.js 14 (App Router)**、**TypeScript**、**Tailwind CSS** 和 **Supabase** 的多店隔离点单与专属虚拟库存系统。

## 进度

### 第一阶段
- [x] 项目骨架与 Supabase 客户端
- [x] PostgreSQL 建表脚本：`supabase/schema.sql`
- [x] 环境变量模板：`.env.local.example`

### 第二阶段
- [x] 登录 / 注册（老板自动建店+邀请码，客户必填邀请码）
- [x] 老板端商品 CRUD：`/owner/products`
- [x] 老板端 / 客户端侧边栏 Layout

### 第三阶段
- [x] 商品选购 `/customer/shop`（绑定店铺商品 + 购物车 + 自动合计）
- [x] 结账 `/customer/checkout`（订单备注 + 强制上传付款截图 + 状态「待确认」）

### 第四阶段
- [x] 老板订单审批 `/owner/orders`（付款截图、接单）
- [x] 单件拒绝制作 + 强制上传退款凭证 →「待确认退款」
- [x] 客户确认退款闭环
- [x] 制作完成 → 即时累加 `inventory`

### 第五阶段
- [x] 客户/老板从专属库存申请发货（备注）
- [x] 提交瞬间事务扣减 `inventory`（防超卖）
- [x] 状态：等待发货 → 老板填物流单号 → 已发货

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
copy .env.local.example .env.local
# 编辑 .env.local，填入 Supabase URL 与 Keys

# 3. 在 Supabase SQL Editor 依次执行
#    supabase/schema.sql
#    supabase/migrations/002_auth_helpers.sql
#    supabase/migrations/003_customer_orders_storage.sql
#    supabase/migrations/004_owner_order_workflow.sql
#    supabase/migrations/005_shipping_inventory.sql

# 3b. Auth 设置（开发环境建议）
#    Authentication → Providers → Email：可关闭 Confirm email 以便注册后直接登录
#    若开启邮件确认，注册仍会创建店铺/绑定，但需验证邮件后再登录

# 4. 创建 Storage 桶（可选，第二阶段上传凭证用）
#    payment-proofs, refund-proofs

# 5. 启动开发服务器
npm run dev
```

## 项目目录结构

```
Shopping/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 登录 / 注册 / 邀请码加入
│   │   ├── login/
│   │   └── register/
│   ├── (customer)/               # 客人端
│   │   ├── menu/                 # 浏览商品、下单
│   │   ├── orders/               # 我的订单、上传付款截图
│   │   ├── inventory/            # 专属虚拟库存
│   │   └── shipping/             # 发货申请
│   ├── (owner)/                  # 老板端
│   │   ├── dashboard/
│   │   ├── products/             # 商品与定价
│   │   ├── orders/               # 审核订单与明细状态
│   │   ├── refunds/              # 退款凭证与处理
│   │   └── shipping/             # 发货处理
│   ├── api/                      # Route Handlers（Webhook、服务端动作）
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # 通用 UI 组件
│   ├── customer/
│   └── owner/
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 浏览器端 Supabase
│   │   ├── server.ts             # Server Components / Actions
│   │   └── middleware.ts         # Session 刷新
│   └── utils/
├── types/
│   └── database.ts               # DB 类型（可用 CLI 重新生成）
├── supabase/
│   └── schema.sql                # 完整 PostgreSQL 建表 + RLS
├── middleware.ts
├── .env.local.example
└── package.json
```

## 数据模型概要

| 表 | 说明 |
|---|---|
| `shops` | 店铺，`invite_code` 供客户加入 |
| `profiles` | 用户扩展，`role` = owner / customer，`shop_id` 多店隔离 |
| `products` | 商品与定价 |
| `orders` | 订单主表，含 `payment_proof_url` |
| `order_items` | 明细状态：待审核 → 制作中 → 已入库 / 退款流程 |
| `inventory` | 专属虚拟库存 `(user_id, product_id, quantity)` |
| `refund_records` | 老板拒绝时的 `refund_proof_url` 与客户确认 |
| `shipping_requests` | 发货申请（等待发货 / 已发货、物流单号、备注） |
| `shipping_request_items` | 发货商品明细 |

## 技术栈

- Next.js 14.2
- React 18
- TypeScript 5
- Tailwind CSS 3
- Supabase Auth + PostgreSQL + Storage
