import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ---------------- 工具 ---------------- */

export const uid = (prefix = '') =>
  prefix + crypto.randomBytes(6).toString('hex');

const derive = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');

export function hashPassword(pw) {
  const salt = crypto.randomBytes(8).toString('hex');
  return `${salt}:${derive(pw, salt)}`;
}

export function verifyPassword(pw, stored = '') {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(derive(pw, salt), 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch {
    return false;
  }
}

export function orderNo() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHO${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${rand}`;
}

const daysAgo = (n) =>
  new Date(Date.now() - n * 86400000 - Math.floor(Math.random() * 86400000)).toISOString();

/* ---------------- 种子数据 ---------------- */

const CATEGORIES = [
  { id: 'cat_phone', name: '手机数码', slug: 'phone', icon: 'smartphone' },
  { id: 'cat_computer', name: '电脑办公', slug: 'computer', icon: 'laptop' },
  { id: 'cat_audio', name: '影音娱乐', slug: 'audio', icon: 'headphones' },
  { id: 'cat_wearable', name: '智能穿戴', slug: 'wearable', icon: 'watch' },
  { id: 'cat_camera', name: '摄影摄像', slug: 'camera', icon: 'camera' },
  { id: 'cat_home', name: '家居生活', slug: 'home', icon: 'home' },
  { id: 'cat_sports', name: '运动户外', slug: 'sports', icon: 'dumbbell' },
];

const RAW_PRODUCTS = [
  ['星河 X9 Pro 智能手机', '2K 护眼屏 · 5000mAh 大电池', 'cat_phone', 2999, 3499, 265, 'smartphone', 1280, 4.9],
  ['星河 X9 标准版', '轻薄机身 · 6400 万像素', 'cat_phone', 1999, 2299, 330, 'smartphone', 2140, 4.7],
  ['星河 Buds 3 无线耳机', '主动降噪 · 30 小时续航', 'cat_phone', 499, 599, 40, 'headphones', 860, 4.8],
  ['轻薄本 Air 14 锐龙版', '14 英寸 · 16G+512G · 1.3kg', 'cat_computer', 4299, 4799, 22, 'laptop', 96, 4.6],
  ['设计师本 Pro 16', '2.5K 高色域屏 · 独显直连', 'cat_computer', 7999, 8999, 18, 'laptop', 210, 4.8],
  ['静音无线鼠标 M2', '蓝牙双模 · 静音微动', 'cat_computer', 89, 129, 212, 'cpu', 1520, 4.5],
  ['机械键盘 K87 客制化', 'Gasket 结构 · 三模连接', 'cat_computer', 459, 559, 10, 'cpu', 380, 4.7],
  ['头戴式降噪耳机 Q7', '42dB 深度降噪 · Hi-Res 认证', 'cat_audio', 1299, 1499, 200, 'headphones', 640, 4.8],
  ['桌面蓝牙音箱 S3', '360° 环绕 · IPX7 防水', 'cat_audio', 399, 469, 194, 'headphones', 720, 4.6],
  ['智能手表 GT4', '14 天续航 · 血氧心率监测', 'cat_wearable', 899, 999, 265, 'watch', 1180, 4.7],
  ['运动手环 Fit 8', '全天候血氧 · 50 米防水', 'cat_wearable', 199, 249, 12, 'watch', 2300, 4.5],
  ['智能眼镜 Vision Lite', '语音助手 · 开放式听歌', 'cat_wearable', 1599, 1799, 200, 'watch', 130, 4.4],
  ['微单相机 A7M', '全画幅 · 4K 60P 视频', 'cat_camera', 9999, 10999, 200, 'camera', 68, 4.9],
  ['便携云台稳定器', '三轴防抖 · 折叠机身', 'cat_camera', 799, 899, 300, 'camera', 260, 4.6],
  ['补光灯 LED Pro', '可调色温 · 内置电池', 'cat_camera', 259, 329, 90, 'camera', 410, 4.3],
  ['北欧风布艺沙发', '三人位 · 高回弹海绵', 'cat_home', 3299, 3999, 15, 'home', 45, 4.7],
  ['记忆棉护颈枕', '慢回弹 · 可拆洗枕套', 'cat_home', 129, 189, 30, 'home', 890, 4.5],
  ['静音循环扇', '直流变频 · 遥控定时', 'cat_home', 459, 529, 100, 'home', 320, 4.6],
  ['智能台灯 Pro', '国 AA 级照度 · 无频闪', 'cat_home', 299, 359, 100, 'home', 640, 4.7],
  ['手冲咖啡套装', '磨豆机 + 分享壶 + 滤杯', 'cat_home', 359, 429, 330, 'coffee', 280, 4.8],
  ['碳纤维登山杖', '超轻铝合金 · 三节伸缩', 'cat_sports', 219, 279, 200, 'dumbbell', 190, 4.5],
  ['专业跑步鞋 Air 5', '缓震回弹 · 透气飞织', 'cat_sports', 599, 699, 20, 'dumbbell', 760, 4.7],
  ['智能跳绳 Counter', '计数校准 · 无绳球款', 'cat_sports', 99, 139, 150, 'dumbbell', 1450, 4.4],
  ['折叠露营桌椅套装', '一秒收纳 · 铝合金桌面', 'cat_sports', 689, 799, 300, 'package', 150, 4.6],
];

function seedProducts() {
  return RAW_PRODUCTS.map(([name, subtitle, categoryId, price, originalPrice, hue, icon, sales, rating], i) => ({
    id: `p${String(i + 1).padStart(3, '0')}`,
    name,
    subtitle,
    description: `${name}\n\n核心卖点：\n· ${subtitle}\n· 正品行货，全国联保\n· 支持七天无理由退换\n· 16:00 前付款当日发出`,
    categoryId,
    price,
    originalPrice,
    stock: 20 + ((i * 37) % 180),
    sales,
    rating,
    hue,
    icon,
    status: 'on',
    featured: i % 5 === 0,
    createdAt: daysAgo(60 - i),
  }));
}

function seedUsers() {
  return [
    {
      id: 'u_admin',
      name: '平台管理员',
      email: 'admin@shoply.com',
      phone: '13800000000',
      password: hashPassword('admin123'),
      role: 'admin',
      status: 'active',
      createdAt: daysAgo(180),
      lastLoginAt: daysAgo(0.2),
    },
    {
      id: 'u_demo',
      name: '张小果',
      email: 'demo@shoply.com',
      phone: '13900001111',
      password: hashPassword('123456'),
      role: 'customer',
      status: 'active',
      createdAt: daysAgo(46),
      lastLoginAt: daysAgo(1),
    },
    {
      id: 'u_lily',
      name: '李茉莉',
      email: 'lily@shoply.com',
      phone: '13700002222',
      password: hashPassword('123456'),
      role: 'customer',
      status: 'active',
      createdAt: daysAgo(30),
      lastLoginAt: daysAgo(3),
    },
    {
      id: 'u_wang',
      name: '王大锤',
      email: 'wang@shoply.com',
      phone: '13600003333',
      password: hashPassword('123456'),
      role: 'customer',
      status: 'disabled',
      createdAt: daysAgo(12),
      lastLoginAt: daysAgo(9),
    },
  ];
}

function seedProviders() {
  const base = {
    alipay: ['支付宝', 'alipay', 0.6, '支付宝当面付 / 手机网站支付，支持花呗分期'],
    wechat: ['微信支付', 'wechat', 0.6, '微信公众号 / 小程序 / H5 支付'],
    unionpay: ['银联云闪付', 'unionpay', 0.5, '银联全渠道支付，支持境内外银行卡'],
    stripe: ['Stripe', 'stripe', 2.9, '国际信用卡收单，支持 Visa / Mastercard'],
    paypal: ['PayPal', 'paypal', 3.2, '跨境收款，覆盖 200+ 国家与地区'],
  };
  return Object.entries(base).map(([code, [name, c, feeRate, description]], i) => ({
    id: `pay_${code}`,
    name,
    code: c,
    enabled: i < 3,
    mode: 'sandbox',
    appId: code === 'stripe' ? 'pk_test_shoply' : `${code}_app_20240916`,
    merchantId: `2088${String(100000 + i * 137) }`,
    secret: 'sk_live_shoply_demo_key_9527',
    feeRate,
    sort: i,
    description,
    updatedAt: daysAgo(5 - i),
  }));
}

function seedOrders(products) {
  const pick = (id) => products.find((p) => p.id === id);
  const users = [
    { id: 'u_demo', name: '张小果' },
    { id: 'u_lily', name: '李茉莉' },
  ];

  const build = (i, items, status, days, provider) => {
    const goods = items.map(([pid, qty]) => {
      const p = pick(pid);
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        qty,
        hue: p.hue,
        icon: p.icon,
      };
    });
    const amount = goods.reduce((s, g) => s + g.price * g.qty, 0);
    const discount = i % 2 === 0 ? 20 : 0;
    const shipping = amount - discount >= 199 ? 0 : 12;
    const createdAt = daysAgo(days);
    const timeline = [{ at: createdAt, text: '订单创建成功' }];
    if (status !== 'pending') {
      timeline.push({ at: createdAt, text: `支付成功（${provider.name}）` });
    }
    if (status === 'shipped' || status === 'completed') {
      timeline.push({ at: daysAgo(days - 1), text: '商品已发货，顺丰速运 SF1234567890' });
    }
    if (status === 'completed') {
      timeline.push({ at: daysAgo(days - 3), text: '买家已确认收货，订单完成' });
    }
    if (status === 'cancelled') {
      timeline.push({ at: daysAgo(days - 0.5), text: '超时未支付，订单自动取消' });
    }

    return {
      id: `o_seed_${i + 1}`,
      orderNo: `SHO2026${String(916 - i).padStart(4, '0')}`,
      userId: users[i % 2].id,
      userName: users[i % 2].name,
      goods,
      amount,
      discount,
      shippingFee: shipping,
      payAmount: Math.max(0, amount - discount + shipping),
      status,
      couponCode: discount ? 'SAVE20' : undefined,
      address: {
        name: users[i % 2].name,
        phone: i % 2 ? '13700002222' : '13900001111',
        detail:
          i % 2
            ? '上海市浦东新区世纪大道 100 号环球金融中心 32 层'
            : '广东省深圳市南山区科技园南区高新南七道 12 号',
      },
      providerId: provider.id,
      providerName: provider.name,
      payNo: status === 'pending' ? undefined : `${provider.code.toUpperCase()}${Date.now() - i * 1000}`,
      timeline,
      createdAt,
      paidAt: status === 'pending' ? undefined : createdAt,
      shippedAt: status === 'shipped' || status === 'completed' ? daysAgo(days - 1) : undefined,
      completedAt: status === 'completed' ? daysAgo(days - 3) : undefined,
    };
  };

  const providers = [
    { id: 'pay_alipay', name: '支付宝', code: 'alipay' },
    { id: 'pay_wechat', name: '微信支付', code: 'wechat' },
    { id: 'pay_unionpay', name: '银联云闪付', code: 'unionpay' },
  ];

  return [
    build(0, [['p003', 1], ['p001', 1]], 'completed', 9, providers[0]),
    build(1, [['p010', 1]], 'completed', 6, providers[1]),
    build(2, [['p020', 2]], 'shipped', 3, providers[2]),
    build(3, [['p009', 1], ['p016', 1]], 'paid', 1, providers[0]),
    build(4, [['p013', 1]], 'pending', 0.3, providers[1]),
    build(5, [['p022', 1]], 'cancelled', 5, providers[2]),
  ];
}

function seed() {
  const products = seedProducts();
  return {
    users: seedUsers(),
    categories: CATEGORIES,
    products,
    carts: {
      u_demo: [
        { productId: 'p001', qty: 1 },
        { productId: 'p003', qty: 2 },
      ],
    },
    orders: seedOrders(products),
    providers: seedProviders(),
    coupons: [
      { code: 'SAVE20', type: 'amount', value: 20, minAmount: 99, label: '满 99 减 20' },
      { code: 'NEW50', type: 'percent', value: 10, minAmount: 0, maxDiscount: 50, label: '全场 9 折（最高减 50）' },
      { code: 'FREESHIP', type: 'shipping', value: 0, minAmount: 0, label: '免运费' },
    ],
    settings: {
      siteName: 'Shoply',
      slogan: '好物精选，放心购',
      currency: 'CNY',
      shippingFee: 12,
      freeShippingThreshold: 199,
      supportPhone: '400-800-1234',
      supportEmail: 'support@shoply.com',
    },
    tokens: {},
  };
}

/* ---------------- 持久化 ---------------- */

let db = null;

export function load() {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // 兼容旧版本数据
      db.carts ||= {};
      db.tokens ||= {};
      db.coupons ||= [];
    } else {
      db = seed();
      persist();
    }
  } catch (e) {
    console.error('[db] 读取失败，已重建种子数据：', e.message);
    db = seed();
    persist();
  }
  return db;
}

export function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('[db] 写入失败：', e.message);
  }
}

export function reset() {
  db = seed();
  persist();
  return db;
}

export default load;
