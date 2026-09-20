import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db, {
  hashPassword,
  load,
  orderNo,
  persist,
  reset,
  uid,
  verifyPassword,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.use(express.json());

const data = () => load();

/* ---------------- 中间件 ---------------- */

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token && data().tokens[token];
  const user = userId && data().users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ message: '请先登录' });
  req.user = user;
  req.token = token;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
}

const publicUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

const fail = (res, code, message) => res.status(code).json({ message });

/* ---------------- 认证 ---------------- */

app.post('/api/auth/register', (req, res) => {
  const { name = '', email = '', phone = '', password = '' } = req.body || {};
  if (name.trim().length < 2) return fail(res, 400, '姓名至少 2 个字符');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, '请输入有效邮箱');
  if (password.length < 6) return fail(res, 400, '密码至少 6 位');

  const d = data();
  if (d.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return fail(res, 400, '该邮箱已注册');
  }

  const user = {
    id: uid('u_'),
    name: name.trim(),
    email: email.trim(),
    phone: phone || '',
    password: hashPassword(password),
    role: 'customer',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  d.users.push(user);
  const token = uid('t_');
  d.tokens[token] = user.id;
  persist();
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const d = data();
  const user = d.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !verifyPassword(password, user.password)) {
    return fail(res, 400, '邮箱或密码不正确');
  }
  if (user.status === 'disabled') return fail(res, 403, '账号已被停用，请联系客服');

  user.lastLoginAt = new Date().toISOString();
  const token = uid('t_');
  d.tokens[token] = user.id;
  persist();
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.put('/api/auth/profile', auth, (req, res) => {
  const { name, phone } = req.body || {};
  if (name !== undefined) req.user.name = String(name).trim() || req.user.name;
  if (phone !== undefined) req.user.phone = String(phone).trim();
  persist();
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/password', auth, (req, res) => {
  const { oldPassword = '', newPassword = '' } = req.body || {};
  if (!verifyPassword(oldPassword, req.user.password)) {
    return fail(res, 400, '当前密码不正确');
  }
  if (newPassword.length < 6) return fail(res, 400, '新密码至少 6 位');
  req.user.password = hashPassword(newPassword);
  persist();
  res.json({ ok: true });
});

/* ---------------- 站点 / 分类 / 商品 ---------------- */

app.get('/api/settings', (req, res) => res.json(data().settings));

app.get('/api/categories', (req, res) => res.json(data().categories));

app.get('/api/products', (req, res) => {
  const { keyword = '', categoryId = '', sort = 'default', page = '1', pageSize = '12' } = req.query;
  let list = data().products.filter((p) => p.status === 'on');
  if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
  if (keyword) {
    const k = String(keyword).toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(k) || p.subtitle.toLowerCase().includes(k)
    );
  }
  const sorted = [...list];
  if (sort === 'sales') sorted.sort((a, b) => b.sales - a.sales);
  else if (sort === 'new') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.sales - a.sales);

  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(60, Math.max(1, Number(pageSize) || 12));
  res.json({
    list: sorted.slice((p - 1) * size, p * size),
    total: sorted.length,
    page: p,
    pageSize: size,
  });
});

app.get('/api/products/:id', (req, res) => {
  const p = data().products.find((x) => x.id === req.params.id);
  if (!p || p.status !== 'on') return fail(res, 404, '商品不存在或已下架');
  res.json(p);
});

/* ---------------- 购物车 ---------------- */

function cartResponse(user) {
  const d = data();
  const raw = d.carts[user.id] || [];
  const items = raw
    .map((i) => {
      const product = d.products.find((p) => p.id === i.productId);
      if (!product || product.status !== 'on') return null;
      return { productId: product.id, qty: Math.max(1, i.qty), product };
    })
    .filter(Boolean);
  return {
    items,
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    totalAmount: items.reduce((s, i) => s + i.qty * i.product.price, 0),
  };
}

app.get('/api/cart', auth, (req, res) => res.json(cartResponse(req.user)));

app.post('/api/cart', auth, (req, res) => {
  const { productId, qty = 1 } = req.body || {};
  const product = data().products.find((p) => p.id === productId);
  if (!product || product.status !== 'on') return fail(res, 400, '商品不存在或已下架');
  if (product.stock <= 0) return fail(res, 400, '商品库存不足');

  const d = data();
  d.carts[req.user.id] ||= [];
  const hit = d.carts[req.user.id].find((i) => i.productId === productId);
  if (hit) hit.qty = Math.min(product.stock, hit.qty + Number(qty));
  else d.carts[req.user.id].push({ productId, qty: Math.min(product.stock, Number(qty)) });
  persist();
  res.json(cartResponse(req.user));
});

app.post('/api/cart/sync', auth, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const d = data();
  d.carts[req.user.id] ||= [];
  items.forEach(({ productId, qty }) => {
    const product = d.products.find((p) => p.id === productId);
    if (!product || product.status !== 'on') return;
    const hit = d.carts[req.user.id].find((i) => i.productId === productId);
    const n = Math.min(product.stock, Number(qty) || 1);
    if (hit) hit.qty = Math.min(product.stock, hit.qty + n);
    else d.carts[req.user.id].push({ productId, qty: n });
  });
  persist();
  res.json(cartResponse(req.user));
});

app.put('/api/cart/:productId', auth, (req, res) => {
  const d = data();
  const qty = Number(req.body?.qty);
  d.carts[req.user.id] ||= [];
  if (qty <= 0) {
    d.carts[req.user.id] = d.carts[req.user.id].filter((i) => i.productId !== req.params.productId);
  } else {
    const hit = d.carts[req.user.id].find((i) => i.productId === req.params.productId);
    if (hit) hit.qty = qty;
  }
  persist();
  res.json(cartResponse(req.user));
});

app.delete('/api/cart/:productId', auth, (req, res) => {
  const d = data();
  d.carts[req.user.id] = (d.carts[req.user.id] || []).filter(
    (i) => i.productId !== req.params.productId
  );
  persist();
  res.json(cartResponse(req.user));
});

/* ---------------- 支付渠道 ---------------- */

app.get('/api/payment-providers', (req, res) => {
  res.json(
    data()
      .providers.filter((p) => p.enabled)
      .sort((a, b) => a.sort - b.sort)
      .map(({ secret, ...rest }) => ({ ...rest, secret: undefined }))
  );
});

app.post('/api/coupons/validate', (req, res) => {
  const { code = '', amount = 0 } = req.body || {};
  const c = data().coupons.find((x) => x.code.toLowerCase() === String(code).toLowerCase());
  if (!c) return res.json({ valid: false, message: '优惠码不存在' });
  if (amount < (c.minAmount || 0)) {
    return res.json({ valid: false, message: `订单需满 ${c.minAmount} 元才能使用该优惠码` });
  }
  let discount = 0;
  if (c.type === 'amount') discount = c.value;
  else if (c.type === 'percent') discount = Math.min(c.maxDiscount ?? Infinity, (amount * c.value) / 100);
  else discount = 0;
  res.json({
    valid: true,
    message: '优惠码可用',
    code: c.code,
    discount: Math.round(discount * 100) / 100,
    label: c.label,
  });
});

/* ---------------- 订单 ---------------- */

function computeCoupon(code, amount) {
  if (!code) return { discount: 0, couponCode: undefined };
  const c = data().coupons.find((x) => x.code.toLowerCase() === String(code).toLowerCase());
  if (!c || amount < (c.minAmount || 0)) return { discount: 0, couponCode: undefined };
  let discount = 0;
  if (c.type === 'amount') discount = c.value;
  else if (c.type === 'percent') discount = Math.min(c.maxDiscount ?? Infinity, (amount * c.value) / 100);
  return { discount: Math.round(discount * 100) / 100, couponCode: c.code };
}

app.post('/api/orders/checkout', auth, (req, res) => {
  const { address = {}, providerId, couponCode, items } = req.body || {};
  if (!address.name || !address.phone || !address.detail) {
    return fail(res, 400, '请填写完整的收货信息');
  }
  const d = data();
  const provider = d.providers.find((p) => p.id === providerId && p.enabled);
  if (!provider) return fail(res, 400, '支付方式不可用');

  let lines;
  if (Array.isArray(items) && items.length) {
    lines = items
      .map((i) => {
        const product = d.products.find((p) => p.id === i.productId);
        return product ? { product, qty: Math.max(1, Number(i.qty) || 1) } : null;
      })
      .filter(Boolean);
  } else {
    lines = (d.carts[req.user.id] || [])
      .map((i) => {
        const product = d.products.find((p) => p.id === i.productId);
        return product ? { product, qty: i.qty } : null;
      })
      .filter(Boolean);
  }

  if (!lines.length) return fail(res, 400, '没有需要结算的商品');
  for (const { product, qty } of lines) {
    if (product.status !== 'on') return fail(res, 400, `「${product.name}」已下架`);
    if (product.stock < qty) return fail(res, 400, `「${product.name}」库存不足`);
  }

  const amount = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const { discount, couponCode: applied } = computeCoupon(couponCode, amount);
  const shipping =
    amount - discount >= d.settings.freeShippingThreshold ? 0 : d.settings.shippingFee;
  const now = new Date().toISOString();

  const order = {
    id: uid('o_'),
    orderNo: orderNo(),
    userId: req.user.id,
    userName: req.user.name,
    goods: lines.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty,
      hue: product.hue,
      icon: product.icon,
    })),
    amount,
    discount,
    shippingFee: shipping,
    payAmount: Math.max(0, Math.round((amount - discount + shipping) * 100) / 100),
    status: 'pending',
    couponCode: applied,
    address: {
      name: address.name,
      phone: address.phone,
      detail: address.detail,
    },
    providerId: provider.id,
    providerName: provider.name,
    timeline: [{ at: now, text: '订单创建成功，等待支付' }],
    createdAt: now,
  };

  lines.forEach(({ product, qty }) => {
    product.stock -= qty;
  });

  // 清空购物车中已下单的商品
  const usedIds = new Set(lines.map((l) => l.product.id));
  d.carts[req.user.id] = (d.carts[req.user.id] || []).filter(
    (i) => !usedIds.has(i.productId)
  );

  d.orders.unshift(order);
  persist();
  res.json(order);
});

app.get('/api/orders', auth, (req, res) => {
  res.json(data().orders.filter((o) => o.userId === req.user.id));
});

app.get('/api/orders/:id', auth, (req, res) => {
  const o = data().orders.find((x) => x.id === req.params.id);
  if (!o) return fail(res, 404, '订单不存在');
  if (o.userId !== req.user.id && req.user.role !== 'admin') {
    return fail(res, 403, '无权查看该订单');
  }
  res.json(o);
});

const pushTimeline = (order, text) =>
  order.timeline.push({ at: new Date().toISOString(), text });

app.post('/api/orders/:id/pay', auth, (req, res) => {
  const o = data().orders.find((x) => x.id === req.params.id);
  if (!o) return fail(res, 404, '订单不存在');
  if (o.userId !== req.user.id) return fail(res, 403, '无权操作该订单');
  if (o.status !== 'pending') return fail(res, 400, '订单状态不允许支付');

  o.status = 'paid';
  o.paidAt = new Date().toISOString();
  o.payNo = `${(data().providers.find((p) => p.id === o.providerId)?.code || 'pay').toUpperCase()}${Date.now()}`;
  pushTimeline(o, `支付成功（${o.providerName}），等待商家发货`);

  o.goods.forEach((g) => {
    const p = data().products.find((x) => x.id === g.productId);
    if (p) p.sales += g.qty;
  });

  persist();
  res.json(o);
});

app.post('/api/orders/:id/cancel', auth, (req, res) => {
  const o = data().orders.find((x) => x.id === req.params.id);
  if (!o) return fail(res, 404, '订单不存在');
  if (o.userId !== req.user.id && req.user.role !== 'admin') {
    return fail(res, 403, '无权操作该订单');
  }
  if (!['pending', 'paid'].includes(o.status)) return fail(res, 400, '当前状态不可取消');

  o.status = 'cancelled';
  pushTimeline(o, '订单已取消');
  o.goods.forEach((g) => {
    const p = data().products.find((x) => x.id === g.productId);
    if (p) p.stock += g.qty;
  });
  persist();
  res.json(o);
});

app.post('/api/orders/:id/confirm', auth, (req, res) => {
  const o = data().orders.find((x) => x.id === req.params.id);
  if (!o) return fail(res, 404, '订单不存在');
  if (o.userId !== req.user.id) return fail(res, 403, '无权操作该订单');
  if (o.status !== 'shipped') return fail(res, 400, '订单尚未发货');

  o.status = 'completed';
  o.completedAt = new Date().toISOString();
  pushTimeline(o, '买家已确认收货，订单完成');
  persist();
  res.json(o);
});

/* ---------------- 后台管理 ---------------- */

app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  const d = data();
  const paid = d.orders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled');
  const today = new Date().toDateString();
  const todayOrders = d.orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const statusCount = { pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0 };
  d.orders.forEach((o) => (statusCount[o.status] = (statusCount[o.status] || 0) + 1));

  res.json({
    userCount: d.users.filter((u) => u.role === 'customer').length,
    productCount: d.products.filter((p) => p.status === 'on').length,
    orderCount: d.orders.length,
    gmv: Math.round(paid.reduce((s, o) => s + o.payAmount, 0) * 100) / 100,
    pendingOrderCount: statusCount.pending || 0,
    todayOrderCount: todayOrders.length,
    todayGmv: Math.round(todayOrders.reduce((s, o) => s + o.payAmount, 0) * 100) / 100,
    lowStockCount: d.products.filter((p) => p.status === 'on' && p.stock < 10).length,
    statusCount,
    recentOrders: [...d.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
  });
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
  res.json([...data().products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim()) return fail(res, 400, '请填写商品名称');
  const now = new Date().toISOString();
  const product = {
    id: uid('p_'),
    name: b.name.trim(),
    subtitle: b.subtitle || '',
    description: b.description || '',
    categoryId: b.categoryId || data().categories[0]?.id,
    price: Number(b.price) || 0,
    originalPrice: Number(b.originalPrice) || Number(b.price) || 0,
    stock: Number(b.stock) || 0,
    sales: 0,
    rating: 5,
    hue: Number(b.hue) || 265,
    icon: b.icon || 'package',
    status: b.status === 'off' ? 'off' : 'on',
    featured: !!b.featured,
    createdAt: now,
  };
  data().products.unshift(product);
  persist();
  res.json(product);
});

app.put('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  const p = data().products.find((x) => x.id === req.params.id);
  if (!p) return fail(res, 404, '商品不存在');
  const b = req.body || {};
  ['name', 'subtitle', 'description', 'categoryId', 'icon', 'status'].forEach((k) => {
    if (b[k] !== undefined) p[k] = b[k];
  });
  ['price', 'originalPrice', 'stock', 'hue'].forEach((k) => {
    if (b[k] !== undefined) p[k] = Number(b[k]) || 0;
  });
  if (b.featured !== undefined) p.featured = !!b.featured;
  persist();
  res.json(p);
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  const d = data();
  const i = d.products.findIndex((x) => x.id === req.params.id);
  if (i < 0) return fail(res, 404, '商品不存在');
  d.products.splice(i, 1);
  persist();
  res.json({ ok: true });
});

app.get('/api/admin/orders', auth, adminOnly, (req, res) => {
  let list = [...data().orders];
  if (req.query.status) list = list.filter((o) => o.status === req.query.status);
  res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.put('/api/admin/orders/:id', auth, adminOnly, (req, res) => {
  const o = data().orders.find((x) => x.id === req.params.id);
  if (!o) return fail(res, 404, '订单不存在');
  const status = req.body?.status;
  const allowed = {
    paid: ['shipped', 'cancelled'],
    shipped: ['completed'],
    pending: ['cancelled'],
  };
  if (!allowed[o.status]?.includes(status)) {
    return fail(res, 400, '不允许的状态流转');
  }
  o.status = status;
  const now = new Date().toISOString();
  if (status === 'shipped') {
    o.shippedAt = now;
    pushTimeline(o, '商家已发货，顺丰速运 SF' + String(Date.now()).slice(-10));
  } else if (status === 'completed') {
    o.completedAt = now;
    pushTimeline(o, '订单已完成');
  } else if (status === 'cancelled') {
    pushTimeline(o, '商家取消了订单');
    o.goods.forEach((g) => {
      const p = data().products.find((x) => x.id === g.productId);
      if (p) p.stock += g.qty;
    });
  }
  persist();
  res.json(o);
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  res.json([...data().users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.put('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const u = data().users.find((x) => x.id === req.params.id);
  if (!u) return fail(res, 404, '用户不存在');
  const { role, status, name } = req.body || {};
  if (role && ['admin', 'customer'].includes(role)) u.role = role;
  if (status && ['active', 'disabled'].includes(status)) u.status = status;
  if (name) u.name = String(name).trim();
  persist();
  res.json(publicUser(u));
});

app.post('/api/admin/users/:id/password', auth, adminOnly, (req, res) => {
  const u = data().users.find((x) => x.id === req.params.id);
  if (!u) return fail(res, 404, '用户不存在');
  const pwd = String(req.body?.password || '');
  if (pwd.length < 6) return fail(res, 400, '密码至少 6 位');
  u.password = hashPassword(pwd);
  persist();
  res.json({ ok: true });
});

app.get('/api/admin/providers', auth, adminOnly, (req, res) => {
  res.json([...data().providers].sort((a, b) => a.sort - b.sort));
});

app.put('/api/admin/providers/:id', auth, adminOnly, (req, res) => {
  const p = data().providers.find((x) => x.id === req.params.id);
  if (!p) return fail(res, 404, '支付渠道不存在');
  const b = req.body || {};
  ['name', 'code', 'appId', 'merchantId', 'secret', 'description'].forEach((k) => {
    if (b[k] !== undefined) p[k] = String(b[k]);
  });
  if (b.enabled !== undefined) p.enabled = !!b.enabled;
  if (b.mode && ['sandbox', 'live'].includes(b.mode)) p.mode = b.mode;
  if (b.feeRate !== undefined) p.feeRate = Number(b.feeRate) || 0;
  if (b.sort !== undefined) p.sort = Number(b.sort) || 0;
  p.updatedAt = new Date().toISOString();
  persist();
  res.json(p);
});

app.post('/api/admin/providers/:id/test', auth, adminOnly, (req, res) => {
  const p = data().providers.find((x) => x.id === req.params.id);
  if (!p) return fail(res, 404, '支付渠道不存在');
  const ok = !!p.appId && !!p.merchantId && !!p.secret;
  res.json({
    ok,
    message: ok
      ? `${p.name}（${p.mode === 'sandbox' ? '沙箱' : '生产'}）参数校验通过，模拟连通成功`
      : `${p.name} 参数不完整，请填写 AppID、商户号与密钥`,
  });
});

app.get('/api/admin/settings', auth, adminOnly, (req, res) => res.json(data().settings));

app.put('/api/admin/settings', auth, adminOnly, (req, res) => {
  const s = data().settings;
  const b = req.body || {};
  ['siteName', 'slogan', 'currency', 'supportPhone', 'supportEmail'].forEach((k) => {
    if (b[k] !== undefined) s[k] = String(b[k]);
  });
  ['shippingFee', 'freeShippingThreshold'].forEach((k) => {
    if (b[k] !== undefined) s[k] = Number(b[k]) || 0;
  });
  persist();
  res.json(s);
});

/* ---------------- 静态资源（生产构建） ---------------- */

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ message: `接口不存在：${req.path}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ message: '服务器内部错误' });
});

/* ---------------- 启动 ---------------- */

if (process.argv.includes('--force')) reset();

app.listen(PORT, () => {
  const d = load();
  console.log(`[shoply] API 服务已启动： http://localhost:${PORT}/api`);
  console.log(
    `[shoply] 商品 ${d.products.length} 件 / 用户 ${d.users.length} 位 / 订单 ${d.orders.length} 单`
  );
  console.log('[shoply] 管理员账号：admin@shoply.com / admin123');
  console.log('[shoply] 演示账号：demo@shoply.com / 123456');
});

export { db };
