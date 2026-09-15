# 达人中心 H5

分销达人个人中心的移动端网页版，与 `daren-miniprogram` 共用同一套视觉与数据。

## 运行

```bash
# 方式一：直接打开（file:// 也能跑，但剪贴板会走降级逻辑）
start index.html

# 方式二：本地起服务，体验更接近线上（推荐）
python -m http.server 8080
# 然后访问 http://localhost:8080/index.html?sid=8823
```

## 目录

```
daren-h5/
├── index.html          工作台（今日收益 / 快捷入口 / 成长进度 / 今日任务 / 热门素材）
├── content.html        内容中心（分类筛选 / 素材列表 / 转发抽屉 / 寄语文案）
├── qr.html             推广 · 分销码（二维码 / 邀请码 / 转化漏斗 / 推广工具）
├── wallet.html         收益中心（余额 / 收益构成 / 周收益 / 资金管理 / 最近佣金）
├── mine.html           我的（达人身份 / 核心入口 / 经营 / 服务与安全）
├── asset.html          素材详情（正文 / 数据指标 / 推荐文案 / 转发）
├── poster.html         专属海报（canvas 实时绘制 / 模板切换 / 长按保存）
├── tasks.html          任务中心（成长值 / 每日任务 / 成长任务 / 等级权益）
├── team.html           我的团队（团队分佣 / 直推间推 / 成员列表）
├── commission.html     佣金明细（汇总 / 状态筛选 / 订单级流水）
├── withdraw.html       提现（金额输入 / 到账方式 / 费用明细 / 提现记录）
├── settings.html       资料设置（基础资料 / 达人身份 / 提现账户 / 通知偏好）
├── css/app.css         全局样式（设计令牌 + 全部组件 + 导航/tabBar/抽屉）
├── css/icons.css       图标（由脚本生成，42 个类 × 3 色）
├── js/data.js          数据层，替换这里即可接真实接口
├── js/app.js           公共交互层（导航、tabBar、Toast、剪贴板、分享引导、归因）
└── tools/build-icons.py  从小程序端 icons.wxss 生成 H5 图标样式
```

## H5 相比小程序需要额外处理的地方

| 能力 | 小程序 | H5 的做法 |
| --- | --- | --- |
| 导航栏 | 原生 `navigationBar` | `APP.nav()` 自绘，品牌页沉浸式，滚动后自动补实底 |
| tabBar | 原生 `tabBar` | `APP.tab()` 自绘，`backdrop-filter` 毛玻璃 + 安全区适配 |
| 复制 | `wx.setClipboardData` | `navigator.clipboard`，非 https 或微信内自动降级为 `execCommand` |
| 分享 | `onShareAppMessage` 直接调起 | **不能直接调起**，只能引导「点击右上角 ···」，见 `APP.shareGuide()` |
| 保存图片 | `saveImageToPhotosAlbum` | canvas 绘制后转 `<img>`，由用户长按保存；非微信端提供 `download` 兜底 |
| 海报 | `canvas 2d` + 相册 | 同一套 canvas 绘制逻辑，输出 dataURL |

## 归因（sid）

所有对外分享的链接都必须带 `sid`，否则佣金归因会断：

```js
APP.link('index.html')              // https://.../index.html?sid=8823
APP.link('asset.html', { id: 'A102' })  // 带上素材参数
```

- 落地页进入时 `APP.sid()` 会把 URL 里的 `sid` 写入 `localStorage`，页面内 tab 切换自动透传；
- 生产环境还需服务端裁决归属（优先绑定 / 30 天锁客），前端只负责上报。

## 接真实接口

`js/data.js` 是唯一的假数据来源，把它换成 `fetch` 即可，页面结构无需改动：

```js
window.DATA = await fetch('/api/daren/overview').then(r => r.json())
```

## 微信生态增强（上线必做）

H5 想拿到「自定义分享卡片」，需要引入微信 JS-SDK 并配置：

1. 服务端签名 `/api/jssdk/signature?url=当前页面URL`；
2. 前端 `wx.config` + `wx.ready`；
3. 在 `wx.updateAppMessageShareData` / `wx.updateTimelineShareData` 里填入 `APP.link()` 生成的带 `sid` 链接与海报图。

接入后，`APP.shareGuide()` 的引导遮罩即可作为降级方案保留。
