# MEMORY

## 项目：问题工单系统 (support-mini-program)

- **项目路径**: `C:\Users\CNYangMe8\Documents\work\AI_coding\support-mini-program`
- **原路径**: `C:\Users\CNYangMe8\Desktop\support-mini-program` (仍保留)
- **描述**: 基于微信小程序的问题工单管理系统，实现用户提交问题 → 管理员接单处理 → 反馈结果的完整闭环
- **技术栈**:
  - 前端: 微信小程序原生框架 (miniprogram/) + Web管理端 (frontend/)
  - 后端: Node.js + Express (backend/server.js)
  - 数据库: SQLite (better-sqlite3, backend/support.db)
- **测试账号**: admin/admin123, staff1/staff123, staff2/staff123
- **后端启动**: `cd backend && npm start` (端口3000)

## 项目：分销达人中心（daren-*）

- **小程序版**: `C:\Users\CNYangMe8\Documents\work\AI_coding\daren-miniprogram`（另有 `preview.html` 浏览器预览稿）
- **H5 版**: `C:\Users\CNYangMe8\Documents\work\AI_coding\daren-h5`（12 个页面 + README）
- **产品定位**: 教育类分销达人的个人中心，核心是「分销码 + 内容中心（一键转发朋友圈/微信群/好友）」
- **设计令牌**: 靛紫 `#6D5DFC` = 品牌信任，暖金 `#FF8A00` = 收益激励；设计稿基准宽 375px
- **约定的工程写法**:
  - 数据层集中在 `utils/mock.js`（小程序）/ `js/data.js`（H5），换接口只改这一处
  - 图标不用二进制资源，用 `base64/data-uri SVG` 背景图，脚本生成（`tools/gen-icons.js` / `tools/build-icons.py`）
  - 图标三色前缀：`ic`=品牌紫 / `icw`=白 / `icg`=中性灰
  - 归因参数 `sid` 必须透传到所有对外分享链接
- **H5 相对小程序的必要差异**: 导航栏与 tabBar 需自绘；剪贴板在微信内要降级到 `execCommand`；分享无法直接调起，只能引导右上角；海报用 canvas 转 `<img>` 后靠长按保存

## 项目：Shoply 电商商城 + 后台管理（shoply/）

- **项目路径**: `C:\Users\CNYangMe8\Documents\work\AI_coding\shoply`
- **描述**: 全栈电商演示：前台（登录注册 / 商品列表详情 / 购物车 / 结算 / 模拟收银台 / 订单）+ 后台（经营概览、商品维护、订单、用户管理、三方支付平台对接、站点设置）
- **技术栈**: React 18 + TS + Vite 5 + Tailwind 3 + React Router 6 + lucide-react；后端 Express 4（ESM），数据落盘 `server/data/db.json`（JSON 文件存储，避免原生模块编译）
- **端口**: 前端 5173（`/api` 代理到 4000），后端 4000；`npm run dev` 一条命令同时起
- **演示账号**: admin@shoply.com/admin123（管理员）、demo@shoply.com/123456
- **设计令牌**: 主色 `#7C3AED` 信任紫，CTA `#22C55E`；标题 Rubik / 正文 Nunito Sans
- **支付**: 模拟实现，后台维护商户参数（密钥脱敏）+ 连接测试；订单状态机 pending→paid→shipped→completed
- **重置数据**: 先停 4000 → `node server/seed.js --force` → 重启 4000（server 内存持有 db，顺序错了会被覆盖）
- **i18n 约定**: 自研轻量方案在 `src/i18n/index.tsx`，`useI18n()` 返回 `{ locale, setLocale, t, money, num, date, status, timeline, pick, intl }`；词条为扁平 key→string，存于 `src/i18n/locales/{zh,en,ja}.ts`，**zh 是基准且 en/ja 与 zh 同为 499 条，新增词条必须三份同时加**（en/ja 有类型约束，漏加会编译报错）。商品/分类/渠道等多语言实体文案走 `pick(entity, field)` 读服务端 `translations`；金额一律 `money()`，订单状态一律 `status()` / `timeline()`，禁止硬编码状态文案或再加 `yuan()` 之类本地化不友好的 helper

## 本机环境

- `node` **不在 PATH**，需用 `C:\Users\CNYangMe8\.workbuddy\binaries\node\versions\<版本>\node.exe`（当前 22.22.2-3）
- `python` / `python3` 在 PATH，可直接执行脚本
- `agent-browser` CLI 未安装，无法做浏览器截图校验
- PowerShell 命令里避免直接写中文（会触发编码解析错误）
