const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../db');

// JWT Secret 必须通过环境变量注入，提供默认值仅用于开发
const SECRET_KEY = process.env.JWT_SECRET || 'support-ticket-system-secret-2026';
const TOKEN_EXPIRES = '2h';       // Access Token 2小时过期
const REFRESH_EXPIRES = '7d';     // Refresh Token 7天过期
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (SECRET_KEY + '-refresh');

// 是否使用环境变量中的 Secret（开发环境提示）
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] 警告: JWT_SECRET 未通过环境变量设置，使用默认值。生产环境请务必设置 JWT_SECRET 环境变量！');
}

// 生成 JWT Access Token（token 中携带版本号用于失效控制）
function generateToken(user, tokenVersion = 1) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, tv: tokenVersion },
    SECRET_KEY,
    { expiresIn: TOKEN_EXPIRES }
  );
}

// 生成 Refresh Token
function generateRefreshToken(user, tokenVersion = 1) {
  return jwt.sign(
    { id: user.id, type: 'refresh', tv: tokenVersion },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

// 验证 Refresh Token 并生成新的 Token 对
function refreshTokens(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    const user = dbGet(
      'SELECT id, username, real_name as realName, role, avatar, phone, status FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!user || user.status === 'disabled') throw new Error('User not found or disabled');

    // 验证 token 版本是否匹配
    const tvRecord = dbGet('SELECT version FROM token_versions WHERE user_id = ?', [user.id]);
    const currentVersion = tvRecord ? tvRecord.version : 1;
    if (decoded.tv !== currentVersion) throw new Error('Token version mismatch');

    const newTokenVersion = currentVersion;
    return {
      token: generateToken(user, newTokenVersion),
      refreshToken: generateRefreshToken(user, newTokenVersion),
      userInfo: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone
      }
    };
  } catch (err) {
    return null;
  }
}

// 使用户所有 Token 失效（密码修改、角色变更时调用）
function invalidateUserTokens(userId) {
  try {
    const tvRecord = dbGet('SELECT version FROM token_versions WHERE user_id = ?', [userId]);
    const newVersion = (tvRecord ? tvRecord.version : 1) + 1;
    if (tvRecord) {
      dbRun('UPDATE token_versions SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newVersion, userId]);
    } else {
      dbRun('INSERT INTO token_versions (user_id, version) VALUES (?, ?)', [userId, newVersion]);
    }
    console.log('[AUTH] 用户', userId, 'Token 版本已更新至 v', newVersion);
    return newVersion;
  } catch (err) {
    console.error('[AUTH] Token 失效失败:', err.message);
    return null;
  }
}

// 认证中间件
function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization || req.headers.token || '';

    if (!token) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const tokenStr = token.replace('Bearer ', '');
    
    // 优先尝试 JWT 验证
    let decoded;
    try {
      decoded = jwt.verify(tokenStr, SECRET_KEY);
    } catch (jwtErr) {
      // 兼容旧版 Base64 Token
      try {
        decoded = JSON.parse(Buffer.from(tokenStr, 'base64').toString());
      } catch (base64Err) {
        return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
      }
    }

    if (!decoded.id) {
      return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
    }

    // 验证用户是否存在且状态正常
    const user = dbGet(
      'SELECT id, username, real_name as realName, role, avatar, phone, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
    }

    // 验证 Token 版本（如果 Token 中含版本号）
    if (decoded.tv !== undefined && decoded.tv !== null) {
      const tvRecord = dbGet('SELECT version FROM token_versions WHERE user_id = ?', [user.id]);
      const currentVersion = tvRecord ? tvRecord.version : 1;
      if (decoded.tv !== currentVersion) {
        return res.status(401).json({ code: 401, message: '密码已修改，请重新登录' });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

// 管理员权限中间件
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '权限不足，仅管理员可操作' });
  }
  next();
}

// 管理员/处理员权限中间件
function staffMiddleware(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ code: 403, message: '权限不足' });
  }
  next();
}

// RBAC 细粒度权限检查中间件工厂函数
function checkPermission(permission) {
  return (req, res, next) => {
    const { role } = req.user;
    // 权限映射：管理员拥有所有权限，处理员拥有工单操作权限
    const rolePermissions = {
      admin: ['*'],
      staff: [
        'ticket:view', 'ticket:take', 'ticket:reply', 'ticket:resolve',
        'ticket:reassign', 'ticket:reject', 'ticket:internal-note',
        'ticket:batch-take', 'kb:create', 'kb:update', 'kb:delete'
      ],
      user: ['ticket:view-self', 'ticket:create', 'ticket:reply-self',
             'ticket:rate', 'ticket:close-self', 'ticket:reopen']
    };

    const perms = rolePermissions[role] || [];
    if (perms.includes('*')) return next();
    if (perms.includes(permission)) return next();

    return res.status(403).json({ code: 403, message: '权限不足：需要 ' + permission + ' 权限' });
  };
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  staffMiddleware,
  checkPermission,
  generateToken,
  generateRefreshToken,
  refreshTokens,
  invalidateUserTokens,
  SECRET_KEY
};
