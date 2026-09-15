/**
 * 演示数据层（H5）。
 * 接入真实接口时，把这一个文件换成 fetch 请求即可，页面结构无需改动。
 */
window.DATA = {
  user: {
    name: '王小雨',
    initial: '雨',
    id: '8823',
    inviteCode: 'DAREN-8823',
    level: 'Lv.4',
    levelName: '黄金分销官',
    commissionRate: '25%',
    nextLevel: 'Lv.5',
    nextLevelName: '钻石分销官',
    nextRate: '28%',
    joinedDays: 268,
    verified: true,
    hasBankCard: true,
    phone: '138****8823'
  },

  overview: {
    todayEarning: '286.50',
    todayDelta: '+12.4%',
    totalEarning: '42,860',
    withdrawable: '3,280',
    pending: '862',
    withdrawn: '38,718',
    todayVisitors: 328,
    todayCustomers: 12,
    todayOrders: 9,
    growthCurrent: 2860,
    growthTarget: 3000,
    growthPercent: 73,
    growthRemain: 1860,
    customerTotal: 86
  },

  notices: [
    { id: 'n1', title: '9 月起教育类课程佣金上调至 25%', sub: '平台公告 · 2 小时前', type: 'notice', icon: 'mega', time: '12:05' },
    { id: 'n2', title: '佣金到账提醒', sub: '客户通过你的分销码下单，佣金 ¥74.50 已入账', type: 'earning', icon: 'coins', time: '14:22' },
    { id: 'n3', title: '团队新增成员', sub: '周若安 通过你的邀请码加入团队', type: 'team', icon: 'users', time: '昨天' },
    { id: 'n4', title: '任务奖励已发放', sub: '完成「分享到朋友圈」，15 成长值已到账', type: 'gift', icon: 'gift', time: '昨天' },
    { id: 'n5', title: '新素材上架', sub: '「开学季必备：5 本书单」已更新', type: 'content', icon: 'grid', time: '09-09' }
  ],

  quickEntries: [
    { key: 'qr', icon: 'qr', label: '分销码', tone: 'violet', url: 'qr.html' },
    { key: 'poster', icon: 'image', label: '专属海报', tone: 'gold', url: 'poster.html' },
    { key: 'content', icon: 'grid', label: '内容中心', tone: 'blue', url: 'content.html' },
    { key: 'invite', icon: 'users', label: '邀请达人', tone: 'green', guide: 'invite' },
    { key: 'customer', icon: 'user', label: '我的客户', tone: 'red', url: 'team.html' },
    { key: 'withdraw', icon: 'wallet', label: '提现', tone: 'gold2', url: 'withdraw.html' },
    { key: 'task', icon: 'target', label: '任务中心', tone: 'violet2', url: 'tasks.html' },
    { key: 'learn', icon: 'book', label: '学习中心', tone: 'cyan', toast: '学习中心建设中' }
  ],

  dailyTasks: [
    { id: 't1', title: '转发 3 条素材到微信', sub: '进度 2/3 · 奖励 20 成长值', icon: 'share', state: 'todo', url: 'content.html' },
    { id: 't2', title: '分享 1 次到朋友圈', sub: '已完成 · +15 成长值', icon: 'check', state: 'done' }
  ],

  allTasks: [
    { id: 'k1', group: 'daily', title: '转发 3 条素材到微信', sub: '进度 2/3 · 奖励 20 成长值', icon: 'share', state: 'todo', action: '去完成', url: 'content.html' },
    { id: 'k2', group: 'daily', title: '分享 1 次到朋友圈', sub: '已完成 · 奖励 15 成长值', icon: 'check', state: 'done' },
    { id: 'k3', group: 'daily', title: '浏览 1 条平台公告', sub: '已完成 · 奖励 10 成长值', icon: 'mega', state: 'claim', action: '领取' },
    { id: 'k4', group: 'grow', title: '累计成交 30 单', sub: '进度 23/30 · 300 成长值', icon: 'award', percent: 77 },
    { id: 'k5', group: 'grow', title: '绑定 100 位客户', sub: '进度 86/100 · 200 成长值', icon: 'user', percent: 86 },
    { id: 'k6', group: 'grow', title: '完成全部必修课', sub: '进度 6/12 · 150 成长值', icon: 'book', percent: 50 }
  ],

  categories: ['全部', '图文', '海报', '短视频', '销售话术', '直播回放'],

  featured: {
    id: 'A101',
    title: '开学季 · 家长最关心的 5 个问题',
    desc: '配套话术 + 海报已就绪，转发即得券',
    cover: 'cov-1'
  },

  assets: [
    { id: 'A102', title: '开学季必备：5 本书单免费领', desc: '配套话术 + 海报已就绪，转发即得券', type: '海报', tags: ['活动', 'K12'], cover: 'cov-2', rate: '8.2%', views: '8,642', shares: '512', updated: '2 小时前' },
    { id: 'A103', title: '3 分钟看懂「费曼学习法」', desc: '短视频 + 长图文，适合社群场景', type: '短视频', tags: ['方法论'], cover: 'cov-3', rate: '6.7%', views: '3.4w', shares: '921', updated: '昨天' },
    { id: 'A104', title: '学员提分 32 分：一位妈妈的真实记录', desc: '真实案例，家长转发率最高', type: '案例故事', tags: ['转化'], cover: 'cov-6', rate: '5.1%', views: '6,218', shares: '348', updated: '3 天前' },
    { id: 'A105', title: '初中数学思维课：为什么刷题没用', desc: '长图文 + 数据图表，理性说服型', type: '图文', tags: ['K12', '深度'], cover: 'cov-5', rate: '4.8%', views: '5,102', shares: '276', updated: '4 天前' }
  ],

  assetDetail: {
    id: 'A102',
    title: '孩子写作业拖拉？3 个方法让效率翻倍',
    cover: 'cov-1',
    type: '图文',
    tags: ['家庭教育', '学习方法', '开学季'],
    rate: '7.4%',
    author: '王小雨 · 黄金分销官',
    updated: '更新于 2 小时前',
    views: '1.2w',
    shares: '386',
    orders: '41',
    paragraphs: [
      '很多家长都有同样的困扰：孩子一写作业就磨蹭。问题往往不在「不认真」，而在任务拆解与时间感知。',
      '方法一：把作业切成 15 分钟的小块。用计时器设定 15 分钟，完成后休息 3 分钟，短周期能显著降低启动阻力。',
      '方法二：先做最难的那一科。意志力在刚开始时最充足，把最难的任务前置，效率提升最明显。',
      '方法三：用「完成清单」替代「催促」。把催促换成可视化的勾选项，让孩子获得即时反馈与掌控感。'
    ],
    copywriting: '孩子写作业拖拉？其实问题不在「不认真」，而在任务拆解和时间感知。分享 3 个我亲测有效的方法，需要的家长可以看看。'
  },

  /* 三种转发寄语风格，贴近达人真实发圈习惯 */
  drafts: [
    '孩子写作业拖拉？其实问题不在「不认真」，而在任务拆解和时间感知。分享 3 个亲测有效的方法，需要的家长可以看看。',
    '刚整理完这份资料，把最难的一科前置 + 15 分钟小块计时，一周就能看到变化。有需要的自取。',
    '开学季免费领：5 本书单 + 配套方法。名额有限，先到先得，直接长按识别领取即可。'
  ],

  qrStats: { scans: '1,286', registers: '86', orders: '23', rate: '6.7%', compare: '高于同级达人 2.1 个百分点' },

  qrTools: [
    { key: 'poster', icon: 'image', tone: 'gold', title: '专属海报模板库', sub: '12 套模板，自动生成带码版', url: 'poster.html' },
    { key: 'invite', icon: 'users', tone: 'green', title: '邀请达人入伙', sub: '奖励 ¥50 / 人 + 团队分佣', badge: '+¥50', guide: 'invite' },
    { key: 'board', icon: 'chart', tone: 'blue', title: '推广数据看板', sub: '扫码 → 注册 → 成交漏斗', toast: '数据看板建设中' },
    { key: 'shortlink', icon: 'link', tone: 'violet', title: '推广短链', sub: 'edu.cn/d/8823 · 可粘贴到任意文案', copy: 'link' }
  ],

  earnings: {
    withdrawable: '3,280.00',
    total: '42,860',
    pending: '862',
    withdrawn: '38,718',
    composition: [
      { label: '自购佣金', percent: 42, color: '#6D5DFC' },
      { label: '直属客户', percent: 38, color: '#FFB020' },
      { label: '团队分佣', percent: 20, color: '#12B76A' }
    ],
    weekly: [
      { label: '一', height: 42 }, { label: '二', height: 63 }, { label: '三', height: 38 },
      { label: '四', height: 78 }, { label: '五', height: 55 },
      { label: '六', height: 96, highlight: true }, { label: '日', height: 70 }
    ],
    avgDaily: '241'
  },

  walletTools: [
    { key: 'bill', icon: 'coins', tone: 'violet', title: '佣金明细', sub: '按订单追溯来源与结算状态', badge: '286 笔', url: 'commission.html' },
    { key: 'record', icon: 'clock', tone: 'green', title: '提现记录', sub: '最近：09-08 提现 ¥2,000 已到账', url: 'withdraw.html' },
    { key: 'rule', icon: 'shield', tone: 'gold', title: '结算与佣金规则', sub: '确认收货后 7 天结算，T+1 到账', toast: '规则页建设中' }
  ],

  bills: [
    { id: 'b1', product: '小学阅读理解专项训练营', no: '20260910-88231', from: '直属', time: '09-10 14:22', amount: '+¥74.50', state: '已结算', stateType: 'green', icon: 'coins' },
    { id: 'b2', product: '开学季书单大礼包', no: '20260910-87904', from: '自购', time: '09-10 10:05', amount: '+¥49.00', state: '待结算', stateType: 'orange', icon: 'coins' },
    { id: 'b3', product: '初中数学思维课（团队·陈思远）', no: '20260909-86122', from: '分佣 8%', time: '09-09 21:47', amount: '+¥23.84', state: '已结算', stateType: 'green', icon: 'users' },
    { id: 'b4', product: '英语自然拼读入门', no: '20260907-83008', from: '已退款', time: '09-07 16:33', amount: '-¥38.00', state: '已扣回', stateType: 'gray', icon: 'clock' }
  ],

  team: {
    totalCommission: '8,572.00',
    monthDelta: '本月 +¥1,240',
    members: 28,
    monthAdded: 5,
    rate: '8%',
    direct: { count: 8, rate: '8%' },
    indirect: { count: 20, rate: '3%' },
    list: [
      { id: 'm1', name: '陈思远', initial: '陈', level: 'Lv.3', days: 62, contribution: '¥2,180', relation: '直推', avatar: 'a1' },
      { id: 'm2', name: '林小满', initial: '林', level: 'Lv.3', days: 48, contribution: '¥1,640', relation: '直推', avatar: 'a2' },
      { id: 'm3', name: '赵一诺', initial: '赵', level: 'Lv.2', days: 30, contribution: '¥980', relation: '直推', avatar: 'a3' },
      { id: 'm4', name: '周若安', initial: '周', level: 'Lv.1', days: 12, contribution: '¥210', relation: '间推', avatar: 'a4' }
    ]
  },

  mineTools: [
    { key: 'qr', icon: 'qr', tone: 'violet', title: '分销码', sub: '扫码即绑定', url: 'qr.html' },
    { key: 'poster', icon: 'image', tone: 'gold', title: '专属海报', sub: '12 套模板', url: 'poster.html' },
    { key: 'content', icon: 'grid', tone: 'blue', title: '内容中心', sub: '一键转发', url: 'content.html' },
    { key: 'shortlink', icon: 'link', tone: 'green', title: '推广链接', sub: '短链 + 文案', copy: 'link' }
  ],

  mineBiz: [
    { key: 'customer', icon: 'user', tone: 'red', title: '我的客户', sub: '86 位已绑定 · 今日新增 12', badge: '+12', badgeType: 'violet', url: 'team.html' },
    { key: 'team', icon: 'users', tone: 'green', title: '我的团队', sub: '直推 8 人 · 间推 20 人', badge: '分佣', badgeType: 'gold', url: 'team.html' },
    { key: 'wallet', icon: 'wallet', tone: 'gold2', title: '收益中心', sub: '可提现 ¥3,280.00', url: 'wallet.html' },
    { key: 'task', icon: 'target', tone: 'violet', title: '任务中心', sub: '2/3 已完成 · 可领 20 成长值', badge: '待领取', badgeType: 'orange', url: 'tasks.html' },
    { key: 'learn', icon: 'book', tone: 'cyan', title: '学习中心', sub: '达人必修课 · 已完成 6/12', toast: '学习中心建设中' }
  ],

  mineService: [
    { key: 'verified', icon: 'shield', tone: 'violet', title: '实名认证', sub: '已认证 · 提现前提', badge: '已通过', badgeType: 'green', toast: '实名认证已通过' },
    { key: 'account', icon: 'lock', tone: 'gray', title: '账户与安全', sub: '手机号、登录密码、提现账户', url: 'settings.html' },
    { key: 'help', icon: 'help', tone: 'gold', title: '帮助与客服', sub: '常见问题 · 在线客服 9:00–21:00', toast: '客服会话建设中' }
  ],

  posterTemplates: [
    { key: 'p1', name: '开学季', cover: 'cov-1' },
    { key: 'p2', name: '方法论', cover: 'cov-3' },
    { key: 'p3', name: '限时惠', cover: 'cov-4' },
    { key: 'p4', name: '招募', cover: 'cov-6' },
    { key: 'p5', name: '案例', cover: 'cov-5' }
  ],

  posterContent: {
    title: '开学季必备',
    subtitle: '5 本书单免费领',
    desc: '限时 9.1–9.15 · 仅限前 500 名',
    tip: '长按识别二维码即可领取',
    inviteCode: 'DAREN-8823'
  }
}
