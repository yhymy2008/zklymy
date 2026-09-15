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

## 本机环境

- `node` **不在 PATH**，需用 `C:\Users\CNYangMe8\.workbuddy\binaries\node\versions\<版本>\node.exe`
- `python` / `python3` 在 PATH，可直接执行脚本
- `agent-browser` CLI 未安装，无法做浏览器截图校验
- PowerShell 命令里避免直接写中文（会触发编码解析错误）
