# Shoply 电商商城 + 后台管理系统

一个可直接运行的全栈电商演示项目：前台商城（注册 / 登录 / 商品 / 购物车 / 下单 / 支付） + 后台管理（商品维护 / 订单 / 用户 / 三方支付平台对接 / 站点设置）。

技术栈：React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + React Router 6 + lucide-react，后端 Node.js + Express 4，数据落盘为 JSON 文件（无需数据库，零原生依赖编译）。

## 快速开始

```bash
npm install
npm run dev
```

- 前台商城：http://localhost:5173
- 后端接口：http://localhost:4000/api
- 后台管理：http://localhost:5173/admin

`npm run dev` 通过 concurrently 同时拉起后端（4000）与前端（5173）；Vite 已配置 `/api` 代理到 4000，无需处理跨域。

其他脚本：

```bash
npm run dev:server   # 只启动后端
npm run dev:web      # 只启动前端
npm run build        # 构建前端到 dist/（后端会自动托管 dist 作为生产站点）
npm run seed         # 重置为演示数据
```

## 演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@shoply.com | admin123 |
| 普通用户 | demo@shoply.com | 123456 |

其余种子用户：`lily@shoply.com`、`wang@shoply.com`（密码同为 `123456`）。

## 功能清单

前台商城：注册 / 登录 / 退出，商品列表（关键词搜索、分类筛选、价格区间、排序、分页），商品详情（规格库存、评分、相关推荐），购物车（增删改数量、游客态 localStorage 与登录后服务端合并），结算（地址填写、优惠券、运费规则、支付方式选择），模拟收银台（15 分钟支付倒计时、可模拟支付成功或取消），订单列表与订单详情时间轴，个人中心（资料修改、修改密码）。

后台管理：经营概览（GMV、订单数、用户数、商品数、状态分布、最近订单），商品维护（新增 / 编辑 / 删除、上下架切换、库存与折扣价设置），订单管理（状态 Tab 筛选、详情、发货、状态流转），用户管理（角色调整、启用 / 停用、重置密码），支付平台对接（支付宝 / 微信 / 银联 / Stripe / PayPal 的 AppID、商户号、密钥、费率、环境、启停与连接测试，密钥列表脱敏），站点设置（站名、客服、运费门槛、运费、公告）。

## 订单状态机

`pending`（待支付）→ `paid`（已支付）→ `shipped`（已发货）→ `completed`（已完成），任意未终态可流转为 `cancelled`（已取消）。后端对每次状态变更做合法性校验。

## 优惠券

种子内置三张：`SAVE20`（满 200 减 20）、`NEW50`（满 500 减 50）、`FREESHIP`（免运费），可在结算页试用。

## 目录结构

```
shoply/
├── server/
│   ├── index.js      # Express 全部接口与中间件
│   ├── db.js         # JSON 数据层 + 种子数据 + scrypt 密码哈希
│   ├── seed.js       # 重置演示数据
│   └── data/db.json  # 运行时数据（首次启动自动生成）
└── src/
    ├── admin/        # 后台管理页面
    ├── components/   # 导航栏、页脚、商品卡、受保护路由、UI 基础件
    ├── lib/          # api 封装、格式化、站点设置
    ├── pages/        # 前台页面
    ├── store/        # Auth / Cart / Toast 三个 Context
    ├── types.ts      # 全局类型
    └── App.tsx       # 路由
```

## 支付对接说明

支付为**模拟实现**，不接真实网关。后台「支付平台对接」页维护的商户参数会写入 `server/data/db.json`，「连接测试」按渠道校验参数完整性与环境标记并返回结果；收银台支持「模拟支付成功」以跑通 `pending → paid` 的完整闭环。接入真实网关时，只需在 `server/index.js` 的支付回调处替换签名校验与下单请求逻辑。

## 数据与密码

所有数据存于 `server/data/db.json`，`npm run seed` 可随时恢复演示数据。密码使用 `crypto.scryptSync` 加盐哈希（`salt:hash`），登录校验走 `timingSafeEqual`，服务端不保存明文。
