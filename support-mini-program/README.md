# 系统问题工单管理系统

## 项目概述

一个基于微信小程序的工单管理系统，实现用户提交问题 → 管理员接单处理 → 反馈结果的完整闭环。

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生框架 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |

## 项目结构

```
support-mini-program/
├── backend/                 # 后端服务
│   ├── server.js           # 服务入口
│   ├── db.js               # 数据库初始化
│   ├── middleware/auth.js  # 认证中间件
│   ├── routes/
│   │   ├── tickets.js      # 工单接口
│   │   └── users.js        # 用户接口
│   └── package.json
├── miniprogram/            # 小程序前端
│   ├── app.js/json/wxss   # 应用主文件
│   ├── pages/
│   │   ├── index/          # 首页(登录/统计)
│   │   ├── submit/         # 提交问题
│   │   ├── my-tickets/     # 我的工单列表
│   │   ├── ticket-detail/  # 工单详情(回复/处理)
│   │   └── admin/          # 管理后台
│   │       ├── dashboard/  # 管理面板
│   │       └── ticket-manage/ # 工单管理
│   └── utils/api.js        # API封装
```

## 快速启动

### 1. 启动后端服务

```bash
cd backend
npm install
npm start
```

服务启动后访问: http://localhost:3000

### 2. 配置小程序

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 在 `project.config.json` 中填写你的 AppID
4. 在开发者工具中勾选「不校验合法域名」

### 3. 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 处理员 | staff1 | staff123 |
| 处理员 | staff2 | staff123 |

普通用户可自行注册。

## 功能流程

1. **用户注册/登录** → 首页查看工单统计和趋势
2. **提交工单** → 选择分类、优先级，填写标题和详细描述
3. **管理员接单** → 在管理面板查看待处理工单，一键接单
4. **沟通处理** → 管理员与用户在工单详情中互发回复
5. **解决工单** → 管理员填写处理方案，标记已解决
6. **用户评价** → 用户对处理结果进行星级评价
7. **关闭归档** → 用户确认后关闭工单

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/users/login | 用户登录 |
| POST | /api/users/register | 用户注册 |
| POST | /api/tickets/create | 创建工单 |
| GET | /api/tickets/list | 工单列表 |
| GET | /api/tickets/detail/:id | 工单详情 |
| POST | /api/tickets/claim/:id | 管理员接单 |
| POST | /api/tickets/reply/:id | 添加回复 |
| POST | /api/tickets/resolve/:id | 标记已解决 |
| POST | /api/tickets/rate/:id | 用户评价 |
| POST | /api/tickets/close/:id | 关闭工单 |
| GET | /api/tickets/stats | 统计数据 |
| GET | /api/tickets/notifications | 通知列表 |
