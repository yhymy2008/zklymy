const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun, cache } = require('../db');
const { authMiddleware, adminMiddleware, generateToken, generateRefreshToken, refreshTokens, invalidateUserTokens } = require('../middleware/auth');

// ==================== 简易图形验证码 ====================
// 存储验证码 { captchaId: { code, expires } }
const captchaStore = new Map();

// 清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (now > val.expires) captchaStore.delete(key);
  }
}, 60000);

// 生成验证码（4位数字）
router.get('/captcha', (req, res) => {
  try {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const captchaId = uuidv4();
    captchaStore.set(captchaId, { code, expires: Date.now() + 300000 }); // 5分钟有效

    // 生成 SVG 验证码图片
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="48" viewBox="0 0 120 48">
      <rect width="120" height="48" fill="#f0f4f8" rx="6"/>
      <text x="60" y="33" font-family="Arial,sans-serif" font-size="26" font-weight="bold"
            fill="#0a1628" text-anchor="middle" letter-spacing="8">${code}</text>
      <line x1="10" y1="15" x2="50" y2="35" stroke="#00d4ff" stroke-width="1.5" opacity="0.5"/>
      <line x1="70" y1="10" x2="110" y2="40" stroke="#00d4ff" stroke-width="1.5" opacity="0.5"/>
      <circle cx="20" cy="20" r="1.5" fill="#8899aa" opacity="0.5"/>
      <circle cx="95" cy="30" r="1.5" fill="#8899aa" opacity="0.5"/>
      <circle cx="55" cy="10" r="1" fill="#8899aa" opacity="0.4"/>
    </svg>`;

    res.json({
      code: 0,
      data: { captchaId, svg: Buffer.from(svg).toString('base64') }
    });
  } catch (err) {
    res.json({ code: 500, message: '生成验证码失败' });
  }
});

// 验证验证码
function verifyCaptcha(captchaId, code) {
  if (!captchaId || !code) return false;
  const entry = captchaStore.get(captchaId);
  if (!entry) return false;
  const valid = entry.code === String(code);
  captchaStore.delete(captchaId); // 一次性使用
  return valid;
}

// 密码强度校验：至少8位，包含字母和数字
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return '密码至少需要8位';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return '密码需要包含至少一个字母';
  }
  if (!/[0-9]/.test(password)) {
    return '密码需要包含至少一个数字';
  }
  return null;
}

// 用户注册
router.post('/register', (req, res) => {
  try {
    const { username, password, realName, phone } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    const pwdError = validatePasswordStrength(password);
    if (pwdError) {
      return res.json({ code: 400, message: pwdError });
    }

    const exist = dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (exist) {
      return res.json({ code: 400, message: '用户名已存在' });
    }

    const id = uuidv4();
    const hashedPwd = bcrypt.hashSync(password, 10);
    dbRun('INSERT INTO users (id, username, password, real_name, phone, role, status) VALUES (?,?,?,?,?,?,?)',
      [id, username, hashedPwd, realName || username, phone || '', 'user', 'active']);

    // 初始化 token 版本
    dbRun('INSERT OR IGNORE INTO token_versions (user_id, version) VALUES (?, 1)', [id]);

    res.json({ code: 0, message: '注册成功' });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({ code: 500, message: '注册失败' });
  }
});

// 用户登录（JWT + Refresh Token）
router.post('/login', (req, res) => {
  try {
    const { username, password, captchaId, captchaCode } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    // 验证码检查（如果提供了验证码参数）
    if (captchaId || captchaCode) {
      if (!verifyCaptcha(captchaId, captchaCode)) {
        return res.json({ code: 400, message: '验证码错误或已过期' });
      }
    }

    const user = dbGet(
      'SELECT id, username, password, real_name, role, avatar, phone, status FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    if (user.status === 'disabled') {
      return res.json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }

    // bcrypt 比对
    let pwdValid = false;
    try {
      pwdValid = bcrypt.compareSync(password, user.password);
    } catch (e) { /* not a bcrypt hash */ }

    if (!pwdValid && password === user.password) {
      // 兼容明文密码，自动升级
      const hashedPwd = bcrypt.hashSync(password, 10);
      dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPwd, user.id]);
      pwdValid = true;
    }

    if (!pwdValid) {
      return res.json({ code: 401, message: '用户名或密码错误' });
    }

    // 获取当前 token 版本
    const tvRecord = dbGet('SELECT version FROM token_versions WHERE user_id = ?', [user.id]);
    const tokenVersion = tvRecord ? tvRecord.version : 1;

    // 生成 Token 对
    const token = generateToken(user, tokenVersion);
    const refreshToken = generateRefreshToken(user, tokenVersion);

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        userInfo: {
          id: user.id,
          username: user.username,
          realName: user.real_name,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone
        }
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.json({ code: 500, message: '登录失败' });
  }
});

// Token 刷新
router.post('/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.json({ code: 400, message: '缺少 refreshToken' });
    }
    const result = refreshTokens(refreshToken);
    if (!result) {
      return res.json({ code: 401, message: 'refreshToken 无效或已过期' });
    }
    res.json({ code: 0, message: 'Token 刷新成功', data: result });
  } catch (err) {
    res.json({ code: 500, message: '刷新 Token 失败' });
  }
});

// 获取所有处理员列表
router.get('/staff-list', authMiddleware, (req, res) => {
  try {
    const staff = dbAll(
      "SELECT id, username, real_name, avatar FROM users WHERE role IN ('staff','admin') AND status = 'active'"
    );
    res.json({ code: 0, data: staff });
  } catch (err) {
    res.json({ code: 500, message: '获取失败' });
  }
});

// 获取个人资料
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const userId = req.user?.id;
    const user = dbGet(
      'SELECT id, username, real_name as realName, role, avatar, phone, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!user) return res.json({ code: 404, message: '用户不存在' });

    let ticketCount = 0, resolvedCount = 0;
    try {
      const r1 = dbAll('SELECT COUNT(*) as cnt FROM tickets WHERE user_id = ?', [userId]);
      ticketCount = r1?.[0]?.cnt || 0;
    } catch (e) { /* ignore */ }
    try {
      const r2 = dbAll('SELECT COUNT(*) as cnt FROM tickets WHERE user_id = ? AND status = "resolved"', [userId]);
      resolvedCount = r2?.[0]?.cnt || 0;
    } catch (e) { /* ignore */ }

    res.json({ code: 0, data: { ...user, ticketCount, resolvedCount } });
  } catch (err) {
    res.json({ code: 500, message: '获取资料失败' });
  }
});

// 更新个人资料
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { realName, phone, avatar } = req.body;
    dbRun('UPDATE users SET real_name = ?, phone = ?, avatar = ? WHERE id = ?',
      [realName || req.user.realName, phone || '', avatar || '', req.user.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.json({ code: 500, message: '更新失败' });
  }
});

// 修改密码
router.put('/change-password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.json({ code: 400, message: '密码不能为空' });

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) return res.json({ code: 400, message: pwdError });

    const user = dbGet('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.json({ code: 404, message: '用户不存在' });

    let pwdValid = false;
    try { pwdValid = bcrypt.compareSync(oldPassword, user.password); } catch (e) { }
    if (!pwdValid && oldPassword === user.password) pwdValid = true;
    if (!pwdValid) return res.json({ code: 400, message: '旧密码不正确' });

    dbRun('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.user.id]);

    // 使所有旧 Token 失效（强制重新登录）
    invalidateUserTokens(req.user.id);

    res.json({ code: 0, message: '密码修改成功，请使用新密码重新登录' });
  } catch (err) {
    res.json({ code: 500, message: '修改密码失败' });
  }
});

// ==================== 管理员：用户管理 ====================

// 获取用户列表
router.get('/list', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { keyword = '', role = '', page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) { where += ' AND (username LIKE ? OR real_name LIKE ?)'; params.push('%' + keyword + '%', '%' + keyword + '%'); }
    if (role) { where += ' AND role = ?'; params.push(role); }

    const total = dbAll('SELECT COUNT(*) as cnt FROM users ' + where, params)[0]?.cnt || 0;
    const list = dbAll(
      'SELECT id, username, real_name, role, phone, avatar, status, created_at FROM users ' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, parseInt(pageSize), offset]
    );

    res.json({ code: 0, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.json({ code: 500, message: '获取用户列表失败' });
  }
});

// 管理员重置用户密码
router.put('/reset-password/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.json({ code: 400, message: '新密码至少8位' });
    }
    const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.json({ code: 404, message: '用户不存在' });

    dbRun('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.params.id]);
    // 重置密码后使该用户所有 Token 失效
    invalidateUserTokens(req.params.id);
    res.json({ code: 0, message: '密码重置成功，该用户需要重新登录' });
  } catch (err) {
    res.json({ code: 500, message: '重置失败' });
  }
});

// 启用/禁用用户
router.put('/status/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'disabled'].includes(status)) {
      return res.json({ code: 400, message: '状态值无效' });
    }
    const user = dbGet('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    if (user.role === 'admin') return res.json({ code: 400, message: '不能禁用管理员账号' });

    dbRun('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ code: 0, message: status === 'active' ? '已启用' : '已禁用' });
  } catch (err) {
    res.json({ code: 500, message: '操作失败' });
  }
});

// 修改用户角色
router.put('/role/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'staff', 'admin'].includes(role)) {
      return res.json({ code: 400, message: '角色值无效' });
    }
    const user = dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.json({ code: 404, message: '用户不存在' });

    dbRun('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    // 角色变更后使该用户所有 Token 失效
    invalidateUserTokens(req.params.id);
    res.json({ code: 0, message: '角色修改成功，该用户需要重新登录' });
  } catch (err) {
    res.json({ code: 500, message: '操作失败' });
  }
});

module.exports = router;
